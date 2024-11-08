import { Client } from "./client";

export class Event {
    eventName: string;

    callback: (client: Client) => void;
    history: { time: number, client: Client }[];

    constructor(eventName: string, callback: (client: Client) => void) {
        this.eventName = eventName;
        this.callback = callback;
        this.history = [];
    }

    public call(client: Client) {
        this.callback(client);
        this.history.push({ time: Date.now(), client });
    }

    public delete() {
        this.callback = I => I;
    }
}