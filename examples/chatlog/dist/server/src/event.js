"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = exports.Events = void 0;
exports.Events = {
    Connect: Symbol('connect'),
    Disconnect: Symbol('disconnect'),
    Update: Symbol('update'),
    PostUpdate: Symbol('postupdate'),
    Edit: Symbol('edit'),
    Input: Symbol('input'),
    Any: Symbol('any'),
    Native: Symbol('native'),
    Custom: Symbol('custom')
};
class Event {
    constructor(eventName, callback) {
        this.eventName = eventName;
        this.callback = callback;
        this.history = [];
    }
    call(client = undefined, data = {}) {
        this.callback(client, data);
        this.history.push({ time: Date.now(), client, data });
    }
    delete() {
        this.callback = I => I;
    }
}
exports.Event = Event;
