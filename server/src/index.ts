import { WebSocket, WebSocketServer } from 'ws';
import { Client } from './client';
import { ConnectionUpdate, EditUpdate, InitializeUpdate, Update } from './update';
import { MultyxValue, MultyxObject, MultyxTeam, MultyxClients } from './multyx';
import Message from './message';
import NanoTimer from 'nanotimer';

import { Server } from 'http';
import { Events, Options, RawObject } from './types';
import { MapToObject, MergeRawObjects } from './utils';

export { Client, MultyxValue, MultyxObject, MultyxTeam };

export class MultyxServer {
    serverData: { [key: string]: any };
    tps: number;
    events: Events;
    all: MultyxTeam;
    updates: Map<Client, Update[]>;

    constructor(server: Server, options: Options = {}) {
        this.serverData = {};
        this.events = {};
        this.tps = options.tps ?? 20;
        this.all = MultyxClients;
        this.updates = new Map();

        new WebSocketServer({ server }).on('connection', (ws: WebSocket) => {
            const client = this.initializeClient(ws);
            this.updates.set(client, []);

            // Find all public data shared to client and compile into raw data
            const publicToClient: Map<Client, RawObject> = new Map();
            publicToClient.set(client, client.shared.parse());
            for(const team of client.teams) {
                const clients = team.parsePublicized();

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
                rawClients,
                this.serverData
            )]));

            // Find all public data client shares and compile into raw data
            const clientToPublic: Map<Client, RawObject> = new Map();
            this.all.clients.forEach(c => clientToPublic.set(c, c.shared.parsePublicized(this.all)));

            for(const team of client.teams) {
                const publicData = client.shared.parsePublicized(team);

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
                
                if(msg.name == '_') {
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

    public on(event: keyof Events, callback: ((...args: any) => void)) {
        this.events[event] = callback;
    }

    private initializeClient(ws: WebSocket): Client {
        const client = new Client(ws, this);
        
        if(this.events.connect) {
            this.events.connect(client);
        }

        MultyxClients.addClient(client);
        return client;
    }
    
    private parseNativeMessage(msg: Message, client: Client) {
        if(msg.data.instruction == 'edit') {
            // Get obj being edited by going through property tree
            let obj = client.shared;
            for(const prop of msg.data.path) {
                obj = obj.get(prop);
                if(!obj || (obj instanceof MultyxValue)) return;
            }

            // Verify value exists
            if(!obj.has(msg.data.prop)) return;
            if(typeof msg.data.value == 'object') return;
            
            // Set value and verify completion
            const valid = obj.set(msg.data.prop, msg.data.value);

            // If change rejected
            if(!valid) {
                return this.addOperation(client, new EditUpdate(
                    client.uuid,
                    [...msg.data.path, msg.data.prop],
                    obj.getValue(msg.data.prop)
                ));
            }
        }
    }

    editUpdate(value: MultyxObject | MultyxValue, clients: Set<Client>) {
        const update = new EditUpdate(
            value.client.uuid,
            value.propertyPath,
            value instanceof MultyxValue ? value.value : value.parse()
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
        for(const client of MultyxClients.clients) {
            const updates = this.updates.get(client);
            if(!updates?.length) continue;
            this.updates.set(client, []);
            
            const msg = Message.Native(updates);

            client.ws.send(msg);
        }
    }
}