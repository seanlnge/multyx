import { Client } from "./client";

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

    callback: (client: Client | undefined, data: any) => void;
    history: { time: number, client: Client | undefined, data: any }[];

    constructor(eventName: EventName, callback: (client: Client | undefined, data: any) => void) {
        this.eventName = eventName;
        this.callback = callback;
        this.history = [];
    }

    public call(client: Client | undefined = undefined, data: any = {}) {
        this.callback(client, data);
        this.history.push({ time: Date.now(), client, data });
    }

    public delete() {
        this.callback = I => I;
    }
}