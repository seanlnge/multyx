import { MultyxServer } from "..";
import Message from "../message";
import { MultyxObject, MultyxValue } from "../multyxtypes";
import { RawObject } from "../types";
import { Client } from "./client";

export class MultyxTeam {
    clients: Set<Client>;
    public: Set<MultyxValue>;
    self: MultyxObject;
    server: MultyxServer;
    uuid: string;

    /**
     * Creates a group of clients sharing public data
     * @param clients List of clients to add to team
     * @returns MultyxTeam object
     */
    constructor(name: string, clients?: Set<Client> | Client[]) {
        this.public = new Set();
        this.self = new MultyxObject({}, this);
        //this.uuid = GenerateUUID();
        this.uuid = name;

        if(!clients) {
            this.clients = new Set();
            return;
        }
        
        this.clients = new Set();
        clients.forEach(c => {
            c.teams.add(this);
            this.clients.add(c);
        });

        this.server = this.clients.values().next().value?.server ?? this.server;
    }

    /**
     * Send an event to all clients on team
     * @param eventName Name of client event
     * @param data Data to send
     */
    send(eventName: string, data: any) {
        const msg = Message.Create(eventName, data);
        for(const client of this.clients) {
            client.ws.send(msg);
        }
    }

    /**
     * Retrieve a client object in the team
     * @param uuid UUID of client to retrieve
     * @returns Client if exists in team, else null
     */
    getClient(uuid: string) {
        const client = Array.from(this.clients.values()).find(x => x.uuid == uuid);
        return client ?? null;
    }

    /**
     * Add a client into the team
     * @param client Client object to add to team
     */
    addClient(client: Client) {
        this.clients.add(client);
        if(!this.server) this.server = client.server;
        client.teams.add(this);
    }

    /**
     * Remove a client from the team
     * @param client Client object to remove from team
     */
    removeClient(client: Client) {
        this.clients.delete(client);
        client.teams.delete(this);
    }

    /**
     * Get raw 
     * @returns 
     */
    getRawPublic(): Map<Client, RawObject> {
        const parsed = new Map();
        this.clients.forEach(c =>
            parsed.set(c, c.self.getRawPublic(this))
        );
        return parsed;
    }
}

export const MultyxClients = new MultyxTeam("all");