import { MultyxServer } from "..";
import Message from "../message";
import { RawObject } from "../types";
import { AddUUID } from "../utils/uuid";
import { Edit, Get, Value } from "../utils/native";
import { Client } from "./client";
import { MultyxValue, MultyxObject } from "../items";

export class MultyxTeam {
    private _clients: Set<Client>;
    private public: Set<MultyxValue>;
    self: MultyxObject;
    server: MultyxServer;
    uuid: string;

    get clients() {
        return Array.from(this._clients);
    }

    /**
     * Creates a group of clients sharing public data
     * @param clients List of clients to add to team
     * @returns MultyxTeam object
     */
    constructor(name: string, clients?: Set<Client> | Client[]) {
        this.public = new Set();
        this.uuid = name;
        
        if(!AddUUID(name)) throw new Error("MultyxTeam name must be unique");

        // Team comes pre-initialized with object of { [client.uuid]: client.self }
        this.self = new MultyxObject({}, this);
        this.self.clients = [];

        if(!clients) {
            this._clients = new Set();
            return;
        }
        
        this._clients = new Set();
        clients.forEach(c => {
            this.self.clients.push(c.uuid);
            c.teams.add(this);
            this._clients.add(c);
        });

        this.server = this.clients.values().next().value?.server ?? this.server;
        this.server[Edit](this.self, this._clients);
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
        if(!this.server) this.server = client.server;
        this.self.clients.push(client.uuid);

        this._clients.add(client);
        client.teams.add(this);

        this.server[Edit](this.self, new Set([client]));
    }

    /**
     * Remove a client from the team
     * @param client Client object to remove from team
     */
    removeClient(client: Client) {
        const index = this.self.clients.findIndex((c: string) => c == client.uuid);
        if(index == -1) return;

        this.self.clients.splice(index, 1);

        this._clients.delete(client);
        client.teams.delete(this);
    }

    addPublic(value: MultyxValue) {
        this.public.add(value);
        value.addPublic(this);
        return true;
    }

    removePublic(value: MultyxValue) {
        const exists = this.public.delete(value);
        value.removePublic(this)
        return exists;
    }

    /**
     * Get publicized data of all clients in team
     * @returns Map between client and publicized data
     */
    [Get](): Map<Client, RawObject> {
        const parsed = new Map();
        this.clients.forEach(c =>
            parsed.set(c, c.self[Get](this))
        );
        return parsed;
    }
}

export const MultyxClients = new MultyxTeam("all");