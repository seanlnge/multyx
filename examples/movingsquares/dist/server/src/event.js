"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
class Event {
    constructor(eventName, callback) {
        this.eventName = eventName;
        this.callback = callback;
        this.history = [];
    }
    call(client) {
        this.callback(client);
        this.history.push({ time: Date.now(), client });
    }
    delete() {
        this.callback = I => I;
    }
}
exports.Event = Event;
