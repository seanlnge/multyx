import { WebSocket, WebSocketServer } from 'ws';

import NanoTimer from 'nanotimer';

import { Callback, RawObject } from './types';
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
    UncompressUpdate,
    Update
} from './messages/update';

import { Event, EventName, Events } from './messages/event';
import { Edit, Get, Parse, Self, EditWrapper, Build, Send, Remove } from './utils/native';
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

    ws: WeakMap<Client, WebSocket>;

    constructor(options: Options | Callback = {}, callback?: Callback) {
        if(typeof options == 'function') {
            callback = options;
            options = {};
        }

        this.options = { ...DefaultOptions, ...options };
        this.options.websocketOptions = { ...DefaultOptions.websocketOptions, ...options.websocketOptions };
        
        if(this.options.server && this.options.port) delete this.options.port;
        if(this.options.port) this.options.websocketOptions.port = this.options.port;
        if(this.options.server) this.options.websocketOptions.server = this.options.server;

        this.events = new Map();
        this.tps = this.options.tps!;
        this.all = new MultyxTeam('all');
        this.updates = new Map();
        this.lastFrame = Date.now();
        this.deltaTime = 0;
        this.ws = new WeakMap();

        const WSServer = new WebSocketServer({ ...this.options.websocketOptions! }, callback);
        
        WSServer.on('connection', (ws: WebSocket) => {
            const client = this.connectionSetup(ws);
            this.ws.set(client, ws);

            ws.on('message', (str: string) => {
                if(!client) return;

                const msg = Message.Parse(str);
                if(msg == null) return client.warnings++;
                
                if(msg.native) {
                    const update = UncompressUpdate(msg.data);
                    if(update == null) {
                        client.warnings++;
                        return;
                    }

                    this.parseNativeMessage(update, client);
                    this.events.get(Events.Native)?.forEach(cb => cb.call(client, update));
                } else {
                    this.events.get(Events.Custom)?.forEach(cb => cb.call(client, msg.data));
                    this.parseCustomMessage(msg, client);
                }
    
                this.events.get(Events.Any)?.forEach(cb => cb.call(client));
            });
    
            ws.on('close', () => {
                if(!client) return;
                
                this.ws.delete(client);
                this.updates.delete(client);
                
                this.events.get(Events.Disconnect)?.forEach(event => event.call(client));
    
                if(this.options.removeDisconnectedClients) {
                    for(const t of client.teams) t.removeClient(client);
                }
                this.all.removeClient(client);
                
                if(this.options.sendConnectionUpdates) {
                    for(const c of this.all.clients) {
                        if(c === client) continue;

                        this.addOperation(c, { instruction: 'dcon', clientUUID: client.uuid });
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
        const client = new Client(this);
        
        this.events.get(Events.Connect)?.forEach(event => event.call(client));

        this.all.addClient(client);

        // Find all public data shared to client and compile into raw data
        const publicToClient: Map<Client, RawObject> = new Map();
        publicToClient.set(client, client.self.relayedValue);
        
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
            teams[team.uuid] = team.self.relayedValue;
        }

        // Build table of constraints for client-side prediction
        const constraintTable = { [client.uuid]: client.self[Build]() };
        for(const team of client.teams) constraintTable[team.uuid] = team.self[Build]();

        // Only time InitializeUpdate is called, to setup client
        ws.send(Message.Native([{
            instruction: 'init',
            client: client[Parse](),
            tps: this.tps,
            constraintTable,
            clients: rawClients,
            teams,
            space: "default"
        }]));

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
            
            this.addOperation(c, {
                instruction: 'conn',
                uuid: client.uuid,
                publicData: clientToPublic.get(c)!
            });
        }

        return client;
    }

    private parseCustomMessage(msg: Message, client: Client) {
        this.events.get(msg.name)?.forEach(event => event.call(client, msg.data));
    }
    
    private parseNativeMessage(update: Update, client: Client) {
        switch(update.instruction) {
            case 'edit': {
                this.parseEditUpdate(update, client);
                this.events.get(Events.Edit)?.forEach(event => event.call(client, update));
                break;
            }
            case 'input': {
                client.controller[Parse](update);
                this.events.get(Events.Input)?.forEach(event => event.call(client, client.controller.state));
                break;
            }
            case 'resp': {
                const promises = this.events.get(Symbol.for("_" + update.name)) ?? [];
                this.events.delete(Symbol.for("_" + update.name));
                promises.forEach(event => event.call(client, update.response));

                const events = this.events.get(update.name) ?? [];
                events.forEach(event => event.call(client, update.response));
                break;
            }
        }
    }

    private parseEditUpdate(update: EditUpdate, client: Client) {
        const path = update.path.slice(1, -1);
        const prop = update.path.slice(-1)[0];

        // First value in path array is client uuid / team name
        const agent = client.uuid === update.path[0]
            ? client
            : Array.from(client.teams).find(t => t.uuid === update.path[0]);
        if(!agent) return;

        const item = agent.self.get(path);
        if(!item || (item instanceof MultyxValue)) return;

        const result = item.set(prop, update.value);

        // Setting object adds an editUpdate to client update list, this removes the redundancy
        if(result) {
            const clientUpdates = this.updates.get(client) ?? [];
            
            const index = clientUpdates.findIndex(pushed => {
                if(pushed.instruction != 'edit') return false;

                if(pushed.path.every((v, i) => update.path[i] == v)
                && pushed.value == update.value) return true;
                
                return false;
            });

            if(index != -1) clientUpdates?.splice(index, 1);
        }

        // If change rejected
        else {
            return this.addOperation(client, {
                instruction: 'edit',
                team: agent instanceof MultyxTeam,
                path: [...update.path],
                value: item.value
            });
        }
    }

    private addOperation(client: Client, update: Update) {
        const updates = this.updates.get(client) ?? [];
        updates.push(update);
        this.updates.set(client, updates);
    }

    /**
     * Turn update list into smaller update list by combining data
     * from the same MultyxObject
     * @param updates List of updates to compress
     * @returns Compressed updates
     */
    private compressUpdates(updates: Update[]) {
        const compressed: Update[] = [];

        const pathToEdit = new Map<string, Update>();
        const pathToSelf = new Map<string, Update>();

        for(const update of updates) {
            // If just connected, all updates accounted for inside conn update
            if(update.instruction == 'init') {
                compressed.length = 0;
                compressed.push(update);
            }

            // Replace old edits on same property
            else if(update.instruction == 'edit') {
                if(update.value == Symbol.for("_remove")) {
                    pathToEdit.delete(update.path.join(' '));
                    continue;
                }
                
                // Property path references are same across updates
                pathToEdit.set(update.path.join(' '), update);
            }

            // Replace old self edits on same property
            else if(update.instruction == 'self') {
                // Self updates send entire value, not just changes
                pathToSelf.set(update.property, update);
            }
            
            // All other updates cannot be compressed / not worth it
            else {
                compressed.push(update);
            }
        }

        // Update order doesn't matter, client callbacks called after update cycle
        for(const value of pathToEdit.values()) compressed.push(value);
        for(const value of pathToSelf.values()) compressed.push(value);

        return compressed;
    }

    /**
     * Send all updates in past frame to clients
     */
    private sendUpdates() {
        this.deltaTime = (Date.now() - this.lastFrame) / 1000;
        this.lastFrame = Date.now();

        for(const client of this.all.clients) {
            client.onUpdate?.(this.deltaTime, client.controller.state);
        }

        this.events.get(Events.Update)?.forEach(event => event.call());

        for(const client of this.all.clients) {
            const rawUpdates = this.updates.get(client);
            if(!rawUpdates?.length) continue;

            const updates = this.compressUpdates(rawUpdates);
            
            const ws = this.ws.get(client);
            if(!ws) continue;
            
            // Client is backpressured and cannot currently be sent more data
            // without ws._sender._queue being stuffed and the heap growing to 1GB+
            if(ws.bufferedAmount > 4 * 1024 * 1024) {
                client.networkIssues++;
                continue;
            }
            
            const msg = Message.Native(updates);
            client.updateSize = msg.length;
            ws.send(msg);

            // Clear updates
            rawUpdates.length = 0;
        }
        
        this.events.get(Events.PostUpdate)?.forEach(event => event.call());
    }

    /**
     * Create an EditUpdate event to send to list of clients
     * @param item MultyxItem to relay state of
     * @param clients Set of all clients to relay event to
     */
    [Edit](item: MultyxItem | MultyxUndefined, clients: Set<Client>) {
        const update = {
            instruction: 'edit',
            team: item.agent instanceof MultyxTeam,
            path: item.propertyPath,
            value: item.relayedValue
        } as Update;
    
        for(const client of clients) {
            this.addOperation(client, update);
        }
    }

    /**
     * Create an EditUpdate event to remove an item from update
     * @param item MultyxItem to relay state of
     * @param clients Set of all clients to relay event to
     */
    [Remove](item: MultyxItem | MultyxUndefined, clients: Set<Client>) {
        for(const client of clients) {
            this.addOperation(client, {
                instruction: 'edit',
                team: item.agent instanceof MultyxTeam,
                path: item.propertyPath,
                value: Symbol.for("_remove")
            });
        }
    }

    /**
     * Create a SelfUpdate event to send to client
     * @param property Self property being updated
     */
    [Self](client: Client, property: SelfUpdate['property'], data: any) {
        this.addOperation(client, {
            instruction: 'self',
            property,
            data
        });
    }

    /**
     * Send message to client
     * @param client Client to send to
     * @param message Message to send
     */
    [Build](client: Client, message: string) {
        this.ws.get(client)?.send(message);
    }

    /**
     * Create a ResponseUpdate to respond to client
     * @param client Client to send response to
     * @param eventName Name of event responding to
     * @param response Response
     */    
    [Send](client: Client, eventName: string, response: any) {
        // Wait until next frame to send response?
        if(this.options.respondOnFrame) {
            this.addOperation(client, {
                instruction: 'resp',
                name: eventName,
                response
            });
        } else {
            this.ws.get(client)?.send(Message.Native([{
                instruction: 'resp',
                name: eventName,
                response
            }]));
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

        const eventObj = new Event(event, callback);

        this.events.get(event)!.push(eventObj);
        return eventObj;
    }

    /**
     * Apply a function to all connected clients, and all clients that will ever be connected
     * @param callback 
     */
    forAll(callback: Callback) {
        for(const client of this.all.clients) {
            callback(client);
        }

        this.on(Events.Connect, callback);
    }
}