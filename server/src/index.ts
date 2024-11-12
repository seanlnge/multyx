import { WebSocket, WebSocketServer } from 'ws';
import { Client, MultyxClients, MultyxTeam, Input, Controller, ControllerState } from './client';
import { ConnectionUpdate, DisconnectUpdate, EditUpdate, InitializeUpdate, Update } from './update';
import { MultyxValue, MultyxObject, MultyxList } from './multyx';
import { Event, EventName, Events } from './event';

import Message from './message';
import NanoTimer from 'nanotimer';

import { Server } from 'http';
import { Options, RawObject } from './types';
import { MapToObject, MergeRawObjects } from './utils';

export {
    Client,
    Input,
    Controller,
    ControllerState,
    Events,

    MultyxValue,
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
                teams,
                this.all.uuid
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
                    this.events.get(Events.Native)?.forEach(cb => cb.call(client));
                } else {
                    this.events.get(Events.Custom)?.forEach(cb => cb.call(client));
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

    public on(event: EventName, callback: (client: Client, data: any) => void): Event {
        if(!this.events.has(event)) this.events.set(event, []);

        const eventObj = new Event(event, callback as ((client: Client | undefined) => void));

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
        const path = msg.data.path.slice(0, -1);
        const prop = msg.data.path.slice(-1)[0];
        
        // Get obj being edited by going through property tree
        let obj;
        if(client.uuid === path[0]) {
            obj = client.self;
        } else {
            for(const team of client.teams) if(path[0] === team.uuid) obj = team.self;
            if(!obj) return;
        }

        for(const p of path.slice(1)) {
            obj = obj.get(p);
            if(!obj || (obj instanceof MultyxValue)) return;
        }
        // Verify value exists
        if(!obj.has(prop) && !(obj instanceof MultyxList)) return;
        if(typeof msg.data.value == 'object') return;

        // Set value and verify completion
        const valid = obj instanceof MultyxList
            ? obj.set(prop, msg.data.value)
            : obj.get(prop).set(msg.data.value);

        // If change rejected
        if(!valid) {
            return this.addOperation(client, new EditUpdate(
                msg.data.path[0],
                msg.data.path.slice(1),
                obj.get(prop).value
            ));
        }
    }

    editUpdate(value: MultyxObject | MultyxValue, clients: Set<Client>) {
        const update = new EditUpdate(
            value.client.uuid,
            value.propertyPath,
            value instanceof MultyxValue ? value.value : value.raw
        );
        
        for(const client of clients) {
            this.addOperation(client, update);
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