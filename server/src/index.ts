import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

import NanoTimer from 'nanotimer';

import { RawObject } from './types';
import { MapToObject, MergeRawObjects } from './utils/objects';

import Message from './messages/message';

import {
    Client,
    Input,
    Controller,
    ControllerState,
    MultyxTeam
} from './agents';

import {
    MultyxItem,
    MultyxList,
    MultyxObject,
    MultyxUndefined,
    MultyxValue
} from './items';

import {
    ConnectionUpdate,
    DisconnectUpdate,
    EditUpdate,
    InitializeUpdate,
    ResponseUpdate,
    SelfUpdate,
    Update
} from './messages/update';

import { Event, EventName, Events } from './messages/event';
import { Edit, Get, Parse, Self, EditWrapper, Build, Send } from './utils/native';
import { DefaultOptions, Options } from './options';


export {
    Client,
    Input,
    Controller,
    ControllerState,
    Events,

    MultyxValue,
    MultyxList,
    MultyxObject,
    MultyxTeam,
    MultyxServer,

    Options,
    RawObject
};

class MultyxServer {
    tps: number;
    events: Map<EventName, Event[]>;
    all: MultyxTeam;
    updates: Map<Client, Update[]>;

    lastFrame: number;
    deltaTime: number;
    options: Options;

    constructor(options: Options = {}) {
        this.options = { ...DefaultOptions, ...options };
        if(!this.options.websocketOptions) this.options.websocketOptions = {};
        if(this.options.server && this.options.port) delete this.options.port;
        if(this.options.port) this.options.websocketOptions.port = this.options.port;
        if(this.options.server) this.options.websocketOptions.server = this.options.server;

        this.events = new Map();
        this.tps = options.tps!;
        this.all = new MultyxTeam('all');
        this.updates = new Map();
        this.lastFrame = Date.now();
        this.deltaTime = 0;

        const WSServer = new WebSocketServer({ ...this.options.websocketOptions! }, this.options.onStart);

        WSServer.on('connection', (ws: WebSocket) => {
            const client = this.connectionSetup(ws);

            ws.on('message', (str: string) => {
                const msg = Message.Parse(str);
                
                if(msg.native) {
                    this.parseNativeMessage(msg, client);
                    this.events.get(Events.Native)?.forEach(cb => cb.call(client, msg.data));
                } else {
                    this.events.get(Events.Custom)?.forEach(cb => cb.call(client, msg.data));
                    this.parseCustomMessage(msg, client);
                }
    
                this.events.get(Events.Any)?.forEach(cb => cb.call(client));
            });
    
            ws.on('close', () => {
                this.events.get(Events.Disconnect)?.forEach(event => event.call(client));
    
                if(this.options.removeDisconnectedClients) for(const t of client.teams) t.removeClient(client);
                
                if(this.options.sendConnectionUpdates) {
                    for(const c of this.all.clients) {
                        if(c === client) continue;
                        
                        this.addOperation(c, new DisconnectUpdate(client.uuid));
                    }
                }
            });
        });

        // Loop send updates
        (new NanoTimer()).setInterval(
            this.sendUpdates.bind(this),
            [],
            Math.round(1000/this.tps) + "m"
        );
    }

    /**
     * Setup connection between server and client, including
     * sending client all initialization information, and relaying
     * public information to all other clients
     * 
     * @param ws Websocket object from connection
     * @returns Client object
     */
    private connectionSetup(ws: WebSocket): Client {
        const client = new Client(ws, this);
        
        this.events.get(Events.Connect)?.forEach(event => event.call(client));

        this.all.addClient(client);

        // Find all public data shared to client and compile into raw data
        const publicToClient: Map<Client, RawObject> = new Map();
        publicToClient.set(client, client.self.value);
        
        for(const team of client.teams) {
            const clients = team[Get]();

            for(const [c, curr] of clients) {
                if(c === client) continue;

                const prev = publicToClient.get(c);
                if(!prev) {
                    publicToClient.set(c, curr);
                    continue;
                }
                publicToClient.set(c, MergeRawObjects(curr, prev));
            }
        }

        const rawClients = MapToObject(publicToClient, c => c.uuid);

        const teams: RawObject = {};
        for(const team of client.teams) {
            teams[team.uuid] = team.self.value;
        }

        // Build table of constraints for client-side prediction
        const constraintTable = { [client.uuid]: client.self[Build]() };
        for(const team of client.teams) constraintTable[team.uuid] = team.self[Build]();

        // Only time InitializeUpdate is called, to setup client
        ws.send(Message.Native([new InitializeUpdate(
            client[Parse](),
            constraintTable,
            rawClients,
            teams
        )]));

        // Clear any updates, all data was already sent in InitializeUpdate
        this.updates.set(client, []);

        // Find all public data client shares and compile into raw data
        const clientToPublic: Map<Client, RawObject> = new Map();
        this.all.clients.forEach(c => clientToPublic.set(c, c.self[Get](this.all)));

        for(const team of client.teams) {
            const publicData = client.self[Get](team);

            for(const c of team.clients) {
                if(c === client) continue;

                clientToPublic.set(c, MergeRawObjects(
                    clientToPublic.get(c)!,
                    publicData
                ));
            }
        }

        if(!this.options.sendConnectionUpdates) return client;

        // Send connection update and public data to all other clients
        for(const c of this.all.clients) {
            if(c === client) continue;
            
            this.addOperation(c, new ConnectionUpdate(
                client.uuid,
                clientToPublic.get(c)!
            ));
        }

        return client;
    }

    private parseCustomMessage(msg: Message, client: Client) {
        this.events.get(msg.name)?.forEach(event => event.call(client, msg.data));
    }
    
    private parseNativeMessage(msg: Message, client: Client) {
        switch(msg.data.instruction) {
            case 'edit': {
                this.parseEditUpdate(msg, client);
                this.events.get(Events.Edit)?.forEach(event => event.call(client, msg.data));
                break;
            }
            case 'input': {
                client.controller[Parse](msg);
                this.events.get(Events.Input)?.forEach(event => event.call(client, client.controller.state));
                break;
            }
        }
    }

    private parseEditUpdate(msg: Message, client: Client) {
        // Use path to search for object, prop to work with object
        const path = msg.data.path.slice(0, -1);
        const prop = msg.data.path.slice(-1)[0];
        
        // First value in path array is client uuid / team name
        let obj;
        if(client.uuid === path[0]) {
            obj = client.self;
        } else {
            for(const team of client.teams) {
                if(path[0] === team.uuid) obj = team.self;
            }
            if(!obj) return;
        }
        
        // Get object being edited by going through property tree
        for(const p of path.slice(1)) {
            obj = obj.get(p);
            if(!obj || (obj instanceof MultyxValue)) return;
        }

        // Set value and verify completion
        const valid = obj.disabled ? false : obj.set(prop, new EditWrapper(msg.data.value));

        // Setting object adds an editUpdate to client update list, this removes the redundancy
        if(valid) {
            const clientUpdates = this.updates.get(client) ?? [];
            
            const index = clientUpdates.findIndex(update => {
                if(!(update instanceof EditUpdate)) return false;

                // Check if the update path matches with the 
                if(update.path.every((v, i) => msg.data.path[i+1] == v)
                && update.value == msg.data.value) return true;
                
                return false;
            });

            if(index != -1) clientUpdates?.splice(index, 1);
        }

        // If change rejected
        if(!valid) {
            return this.addOperation(client, new EditUpdate(
                msg.data.path[0],
                msg.data.path.slice(1),
                obj.get(prop).value
            ));
        }
    }

    private addOperation(client: Client, update: Update) {
        const updates = this.updates.get(client) ?? [];
        updates.push(update);
        this.updates.set(client, updates);
    }

    private sendUpdates() {
        this.deltaTime = (Date.now() - this.lastFrame) / 1000;
        this.lastFrame = Date.now();

        for(const client of this.all.clients) {
            client.onUpdate?.(this.deltaTime, client.controller.state);
        }

        this.events.get(Events.Update)?.forEach(event => event.call());

        for(const client of this.all.clients) {
            const updates = this.updates.get(client);
            if(!updates?.length) continue;
            this.updates.set(client, []);
            
            const msg = Message.Native(updates);

            client.ws.send(msg);
        }
        
        this.events.get(Events.PostUpdate)?.forEach(event => event.call());
    }

    /**
     * Create an EditUpdate event to send to list of clients
     * @param item MultyxItem to relay state of
     * @param clients Set of all clients to relay event to
     */
    [Edit](item: MultyxItem | MultyxUndefined, clients: Set<Client>) {
        const update = new EditUpdate(
            item.agent instanceof MultyxTeam,
            item.propertyPath,
            item.value
        );
        
        for(const client of clients) {
            this.addOperation(client, update);
        }
    }

    /**
     * Create a SelfUpdate event to send to client
     * @param property Self property being updated
     */
    [Self](client: Client, property: typeof SelfUpdate.Properties[number], data: any) {
        const update = new SelfUpdate(
            property,
            data
        );

        this.addOperation(client, update);
    }

    /**
     * Create a ResponseUpdate to respond to client
     * @param client Client to send response to
     * @param eventName Name of event responding to
     * @param response Response
     */    
    [Send](client: Client, eventName: string, response: any) {
        const update = new ResponseUpdate(eventName, response);

        // Wait until next frame to send response?
        if(this.options.respondOnFrame) {
            this.addOperation(client, update);
        } else {
            client.ws.send(Message.Native([update]));
        }
    }

    
    /* All public methods for user use */

    /**
     * Create an event listener for any MultyxEvents
     * @param event 
     * @param callback 
     * @returns Event listener object
     */
    on(event: EventName, callback: (client: Client, data: any) => any): Event {
        if(!this.events.has(event)) this.events.set(event, []);

        const eventObj = new Event(event, callback as ((client: Client | undefined) => any));

        this.events.get(event)!.push(eventObj);
        return eventObj;
    }

    /**
     * Apply a function to all connected clients, and all clients that will ever be connected
     * @param callback 
     */
    forAll(callback: (client: Client) => void) {
        for(const client of this.all.clients) {
            callback(client);
        }

        this.on(Events.Connect, callback as ((client: Client | undefined) => void));
    }
}