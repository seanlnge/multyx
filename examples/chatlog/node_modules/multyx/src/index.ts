import { WebSocket, WebSocketServer } from 'ws';
import { Client, Input, Controller, ControllerState } from './client';
import { ConnectionUpdate, EditUpdate, InitializeUpdate, Update } from './update';
import { MultyxValue, MultyxObject, MultyxTeam, MultyxClients } from './multyx';

import Message from './message';
import NanoTimer from 'nanotimer';

import { Server } from 'http';
import { Events, Options, RawObject } from './types';
import { EditWrapper, MapToObject, MergeRawObjects } from './utils';

export {
    Client,
    Input,
    Controller,
    ControllerState,

    MultyxValue,
    MultyxObject,
    MultyxTeam,
    MultyxServer,

    Events,
    Options,
    RawObject
};

class MultyxServer {
    tps: number;
    events: Events;
    all: MultyxTeam;
    updates: Map<Client, Update[]>;

    lastFrame: number;
    deltaTime: number;

    constructor(server: Server, options: Options = {}) {
        this.events = {};
        this.tps = options.tps ?? 20;
        this.all = MultyxClients;
        this.updates = new Map();
        this.lastFrame = Date.now();
        this.deltaTime = 0;

        new WebSocketServer({ server }).on('connection', (ws: WebSocket) => {
            const client = this.initializeClient(ws);
            this.updates.set(client, []);

            // Find all public data shared to client and compile into raw data
            const publicToClient: Map<Client, RawObject> = new Map();
            publicToClient.set(client, client.shared.raw);
            for(const team of client.teams) {
                const clients = team.getPublic();

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

            ws.send(Message.Native([new InitializeUpdate(
                client.parse(),
                client.shared.buildConstraintTable(),
                rawClients
            )]));

            // Find all public data client shares and compile into raw data
            const clientToPublic: Map<Client, RawObject> = new Map();
            this.all.clients.forEach(c => clientToPublic.set(c, c.shared.getPublic(this.all)));

            for(const team of client.teams) {
                const publicData = client.shared.getPublic(team);

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

    public on<K extends keyof Events>(event: K, callback: Events[K]) {
        this.events[event] = callback;
    }

    private initializeClient(ws: WebSocket): Client {
        const client = new Client(ws, this);
        
        if("connect" in this.events) {
            this.events.connect!(client);
        }

        MultyxClients.addClient(client);
        return client;
    }
    
    private parseNativeMessage(msg: Message, client: Client) {
        switch(msg.data.instruction) {
            case 'edit': return this.parseEditUpdate(msg, client);
            case 'input': return client.controller.parseUpdate(msg);
        }
    }

    private parseEditUpdate(msg: Message, client: Client) {
        const path = msg.data.path.slice(0, -1);
        const prop = msg.data.path.slice(-1)[0];
        
        // Get obj being edited by going through property tree
        let obj = client.shared;
        for(const p of path) {
            obj = obj.get(p);
            if(!obj || (obj instanceof MultyxValue)) return;
        }

        // Verify value exists
        if(!obj.has(prop)) return;
        if(typeof msg.data.value == 'object') return;
        const mv = obj.get(prop) as MultyxValue;

        // Set value and verify completion
        const valid = mv.set(new EditWrapper(msg.data.value));

        // If change rejected
        if(!valid) {
            return this.addOperation(client, new EditUpdate(
                client.uuid,
                msg.data.path,
                mv.value
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

        for(const client of MultyxClients.clients) {
            const updates = this.updates.get(client);
            if(!updates?.length) continue;
            this.updates.set(client, []);
            
            const msg = Message.Native(updates);

            client.ws.send(msg);
        }
    }
}