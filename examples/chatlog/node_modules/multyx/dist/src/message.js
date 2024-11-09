"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Message {
    /**
     * Constructor for creating messages to send to client
     * @param name
     * @param data
     */
    constructor(name, data, native = false) {
        this.name = name;
        this.data = data;
        this.time = Date.now();
        this.native = native;
    }
    // Send multyx client native instructions
    static Native(updates) {
        const data = [];
        for (const update of updates) {
            data.push(update.raw());
        }
        return JSON.stringify(new Message('_', data, true));
    }
    // Create message for user
    static Create(name, data) {
        if (name.length == 0)
            throw new Error('Multyx message cannot have empty name');
        if (name[0] == '_')
            name = '_' + name;
        if (typeof data == 'function') {
            throw new Error('Multyx data must be JSON storable');
        }
        return JSON.stringify(new Message(name, data));
    }
    // Parse message from user
    static Parse(str) {
        const parsed = JSON.parse(str);
        if (parsed.name[0] == '_')
            parsed.name = parsed.name.slice(1);
        return new Message(parsed.name, parsed.data, parsed.name == '');
    }
}
exports.default = Message;
