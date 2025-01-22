import type { WebSocket } from "ws";
import type { RawObject } from "../types";
import type { MultyxServer } from "../index";

import Message from "../messages/message";
import { GenerateUUID } from "../utils/uuid";

import { MultyxObject } from "../items";
import { Parse } from "../utils/native";
import { Controller, ControllerState } from "./controller";

import type MultyxTeam from "./team";

export default class Client {
    data: RawObject;
    self: MultyxObject;
    controller: Controller;
    teams: Set<MultyxTeam>;
    ws: WebSocket;
    server: MultyxServer;
    uuid: string;
    joinTime: number;
    clients: Client[];
    onUpdate: (deltaTime: number, controllerState: ControllerState) => void;

    constructor(ws: WebSocket, server: MultyxServer) {
        this.data = {};
        this.teams = new Set();
        this.ws = ws;
        this.server = server;
        this.uuid = GenerateUUID();
        this.joinTime = Date.now();
        this.clients = [this];
        
        this.self = new MultyxObject({}, this);
        this.controller = new Controller(this);
    }

    send(eventName: string, data: any) {
        this.ws.send(Message.Create(eventName, data));
    }

    /**
     * Create client-side representation of client object
     */
    [Parse](): RawObject {
        return {
            uuid: this.uuid,
            joinTime: this.joinTime,
            controller: Array.from(this.controller.listening.values()),
            self: this.self.value,
        }
    }
}