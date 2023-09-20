import { MultyxClients, MultyxObject, MultyxTeam, MultyxValue } from "./multyx";
import { WebSocket } from "ws";
import { RawObject } from "./types";
import { MultyxServer } from ".";
import { EditUpdate } from "./update";

const UUIDSet = new Set();
function generateUUID(length: number = 8, radix: number = 36): string {
    const unit = radix ** (length - 1);
    const uuid = Math.floor(Math.random() * (radix * unit - unit) + unit).toString(radix);

    if(UUIDSet.has(uuid)) return generateUUID(length, radix);
    UUIDSet.add(uuid);
    return uuid;
}

export class Client {
    data: RawObject;
    shared: MultyxObject;
    teams: Set<MultyxTeam>;
    ws: WebSocket;
    server: MultyxServer;
    uuid: string;
    joinTime: number;

    constructor(ws: WebSocket, server: MultyxServer) {
        this.data = {};
        this.shared = new MultyxObject({}, this);
        this.teams = new Set();
        this.ws = ws;
        this.server = server;
        this.uuid = generateUUID();
        this.joinTime = Date.now();
    }

    /**
     * Create client-side representation of client object
     */
    parse(): RawObject {
        return {
            uuid: this.uuid,
            joinTime: this.joinTime,
            shared: this.shared.parse(),
        }
    }
}