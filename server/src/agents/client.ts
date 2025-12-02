import type { WebSocket } from "ws";
import type { RawObject } from "../types";
import type { MultyxServer } from "../index";

import Message from "../messages/message";
import { GenerateUUID } from "../utils/uuid";

import { MultyxObject } from "../items";
import { Build, Parse, Self } from "../utils/native";
import { Controller, ControllerState } from "./controller";

import type MultyxTeam from "./team";

export default class Client {
    self: MultyxObject;
    controller: Controller;
    teams: Set<MultyxTeam>;
    private agentIndex: Map<string, MultyxTeam | Client>;
    server: MultyxServer;
    uuid: string;
    warnings: number;
    networkIssues: number;
    updateSize: number;
    joinTime: number;
    clients: Client[];
    onUpdate: (deltaTime: number, controllerState: ControllerState) => void;
    
    private space: string;

    constructor(server: MultyxServer) {
        this.teams = new Set();
        this.server = server;
        this.uuid = GenerateUUID();
        this.warnings = 0;
        this.networkIssues = 0;
        this.joinTime = Date.now();
        this.clients = [this];
        this.updateSize = 0;
        this.self = new MultyxObject({}, this);
        this.controller = new Controller(this);
        this.space = 'default';
        this.agentIndex = new Map();
        this.agentIndex.set(this.uuid, this);
    }

    on(eventName: string, callback: (data: any) => any) {
        this.server.on(eventName, (client, response) => {
            if(client == this) callback(response);
        });
    }

    send(eventName: string, data?: any) {
        this.server[Build](this, Message.Create(eventName, data));
    }

    await(eventName: string, data?: any) {
        this.send(eventName, data);
        return new Promise((res) => this.on(eventName, res));
    }

    /**
     * Set the space of the client
     * @param space 
     */
    setSpace(space: string) {
        this.space = space;
        this.server[Self](this, "space", space);
    }

    /**
     * Get the space of the client
     */
    getSpace() {
        return this.space;
    }

    registerTeam(team: MultyxTeam) {
        if(this.teams.has(team)) return;
        this.teams.add(team);
        this.agentIndex.set(team.uuid, team);
    }

    unregisterTeam(team: MultyxTeam) {
        if(!this.teams.has(team)) return;
        this.teams.delete(team);
        this.agentIndex.delete(team.uuid);
    }

    getAgent(identifier: string) {
        return this.agentIndex.get(identifier);
    }

    /**
     * Create client-side representation of client object
     */
    [Parse](): RawObject {
        return {
            uuid: this.uuid,
            joinTime: this.joinTime,
            controller: Array.from(this.controller.listening.values()),
            self: this.self.relayedValue,
            space: this.space,
        }
    }
}