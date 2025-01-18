import { WebSocket, WebSocketServer } from 'ws';

import Message from './message';
import NanoTimer from 'nanotimer';

import { Server } from 'http';
import { Options, RawObject } from './types';
import { MapToObject, MergeRawObjects } from './utils';
import { Client, Input, Controller, ControllerState } from './agents/client';
import { MultyxClients, MultyxTeam } from './agents/team';

import {
    MultyxItem,
    MultyxList,
    MultyxObject,
    MultyxValue
} from './items';

import {
    ConnectionUpdate,
    DisconnectUpdate,
    EditUpdate,
    InitializeUpdate,
    PublicUpdate,
    Update
} from './update';

import { Event, EventName, Events } from './event';


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

    constructor(server: Server, options: Options = {}) {
        this.events = new Map();
        this.tps = options.tps ?? 20;
        this.all = MultyxClients;
        this.updates = new Map();
        this.lastFrame = Date.now();
        this.deltaTime = 0;

        const WSServer = new WebSocketServer({ server });

        WSServer.on('connection', (ws: WebSocket) => {
            const client = this.initializeClient(ws);
            this.updates.set(client, []);

            // Find all public data shared to client and compile into raw data
            const publicToClient: Map<Client, RawObject> = new Map();
            publicToClient.set(client, client.self.raw);
            for(const team of client.teams) {
                const clients = team.getRawPublic();

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
                teams[team.uuid] = team.self.raw;
            }

            ws.send(Message.Native([new InitializeUpdate(
                client.parse(),
                client.self._buildConstraintTable(),
                rawClients,
                teams
            )]));

            // Find all public data client shares and compile into raw data
            const clientToPublic: Map<Client, RawObject> = new Map();
            this.all.clients.forEach(c => clientToPublic.set(c, c.self.getRawPublic(this.all)));

            for(const team of client.teams) {
                const publicData = client.self.getRawPublic(team);

                for(const c of team.clients) {
                    if(c === client) continue;

                    clientToPublic.set(c, MergeRawObjects(
                        clientToPublic.get(c)!,
                        publicData
                    ));
                }
            }

            for(const c of this.all.clients) {
                if(c === client) continue;
                
                this.addOperation(c, new ConnectionUpdate(
                    client.uuid,
                    clientToPublic.get(c)!
                ));
            }

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

                for(const t of client.teams) t.removeClient(client);

                for(const c of this.all.clients) {
                    if(c === client) continue;
                    
                    this.addOperation(c, new DisconnectUpdate(client.uuid));
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

    public on(event: EventName, callback: (client: Client, data: any) => any): Event {
        if(!this.events.has(event)) this.events.set(event, []);

        const eventObj = new Event(event, callback as ((client: Client | undefined) => any));

        this.events.get(event)!.push(eventObj);
        return eventObj;
    }

    /**
     * Apply a function to all connected clients, and all clients that will ever be connected
     * @param callback 
     */
    public forAll(callback: (client: Client) => void) {
        for(const client of this.all.clients) {
            callback(client);
        }

        this.on(Events.Connect, callback as ((client: Client | undefined) => void));
    }

    private initializeClient(ws: WebSocket): Client {
        const client = new Client(ws, this);
        
        this.events.get(Events.Connect)?.forEach(event => event.call(client));

        MultyxClients.addClient(client);
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
                client.controller.__parseUpdate(msg);
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
        const valid = obj.set(prop, msg.data.value);

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

    editUpdate(value: MultyxItem, clients: Set<Client>) {
        const update = new EditUpdate(
            value.agent instanceof MultyxTeam,
            value.propertyPath,
            value instanceof MultyxValue ? value.value : value.raw
        );
        
        for(const client of clients) {
            this.addOperation(client, update);
        }
    }

    publicUpdate(value: MultyxValue, clients: Set<Client>, visible: boolean) {
        const update = new PublicUpdate(
            visible,
            value.propertyPath,
            value.value
        );
    }

    private addOperation(client: Client, update: Update) {
        const updates = this.updates.get(client) ?? [];
        updates.push(update);
        this.updates.set(client, updates);
    }

    private sendUpdates() {
        this.deltaTime = (Date.now() - this.lastFrame) / 1000;
        this.lastFrame = Date.now();

        for(const client of MultyxClients.clients) {
            client.onUpdate?.(this.deltaTime, client.controller.state);
        }

        this.events.get(Events.Update)?.forEach(event => event.call());

        for(const client of MultyxClients.clients) {
            const updates = this.updates.get(client);
            if(!updates?.length) continue;
            this.updates.set(client, []);
            
            const msg = Message.Native(updates);

            client.ws.send(msg);
        }
        
        this.events.get(Events.PostUpdate)?.forEach(event => event.call());
    }
}