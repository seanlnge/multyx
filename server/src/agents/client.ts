import type { WebSocket } from "ws";
import type { RawObject } from "../types";
import type { MultyxServer } from "../index";

import Message from "../messages/message";
import { GenerateUUID } from "../utils/uuid";

import { MultyxObject } from "../items";
import { Build, Parse } from "../utils/native";
import { Controller, ControllerState } from "./controller";

import type MultyxTeam from "./team";

export default class Client {
    self: MultyxObject;
    controller: Controller;
    teams: Set<MultyxTeam>;
    server: MultyxServer;
    uuid: string;
    joinTime: number;
    clients: Client[];
    onUpdate: (deltaTime: number, controllerState: ControllerState) => void;

    constructor(server: MultyxServer) {
        this.teams = new Set();
        this.server = server;
        this.uuid = GenerateUUID();
        this.joinTime = Date.now();
        this.clients = [this];
        
        this.self = new MultyxObject({}, this);
        this.controller = new Controller(this);
    }

    send(eventName: string, data: any) {
        this.server[Build](this, Message.Create(eventName, data));
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