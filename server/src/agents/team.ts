import { MultyxServer } from "..";
import Message from "../messages/message";
import { RawObject } from "../types";
import { AddUUID } from "../utils/uuid";
import { Build, Edit, Get, Send } from "../utils/native";
import { MultyxValue, MultyxObject, type MultyxItem } from "../items";

import type Client from "./client";

export default class MultyxTeam {
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
            this.server[Build](client, msg);
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
        if(this._clients.has(client)) return;

        if(!this.server) this.server = client.server;
        this.self.clients.push(client.uuid);

        this._clients.add(client);
        client.teams.add(this);

        // Send public data of all clients to new client
        for(const mv of this.public) {
            mv[Send](client);
        }

        this.server[Edit](this.self, new Set([client]));
    }

    /**
     * Remove a client from the team
     * @param client Client object to remove from team
     */
    removeClient(client: Client) {
        if(!this._clients.has(client)) return;

        const index = this.self.clients.findIndex((c: string) => c == client.uuid);
        if(index !== -1) this.self.clients.splice(index, 1);

        this._clients.delete(client);
        this.removePublic(client.self);
        client.teams.delete(this);
    }

    /**
     * Make item visible to team
     * @param item MultyxItem to make visible to all clients in team
     * @returns Same MultyxTeam object
     */
    addPublic(item: MultyxItem) {
        if(item instanceof MultyxValue) {
            if(this.public.has(item)) return this;
            this.public.add(item);
        }
        item.addPublic(this);
        return this;
    }

    /**
     * Remove item visibility from team
     * @param item MultyxItem to remove visibility of
     * @returns Same MultyxTeam object
     */
    removePublic(item: MultyxItem) {
        if(item instanceof MultyxValue) {
            if(!this.public.has(item)) return this;
            this.public.delete(item);
        }
        item.removePublic(this);
        return this;
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