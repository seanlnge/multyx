import { Client } from "../agents";
import { Callback } from "../types";
import { Send } from "../utils/native";

export const Events = {
    Connect: Symbol('connect'),
    Disconnect: Symbol('disconnect'),
    Update: Symbol('update'),
    PostUpdate: Symbol('postupdate'),
    Edit: Symbol('edit'),
    Input: Symbol('input'),
    Any: Symbol('any'),
    Native: Symbol('native'),
    Custom: Symbol('custom')
}

export type EventName = typeof Events[keyof typeof Events] | string;

export class Event {
    eventName: EventName;
    callback: Callback;
    saveHistory: boolean;
    history: { time: number, client: Client | undefined, data: any, result: any }[];

    constructor(eventName: EventName, callback: Callback) {
        this.eventName = eventName;
        this.callback = callback;
        this.saveHistory = false;
        this.history = [];
    }

    public call(client: Client | undefined = undefined, data: any = {}) {
        const result = this.callback(client, data);
        if(this.saveHistory) this.history.push({ time: Date.now(), client, data, result });

        if(result !== undefined && client && typeof this.eventName == 'string') {
            client.server[Send](client, this.eventName, result);
        }
    }

    public delete() {
        this.callback = I => I;
    }
}