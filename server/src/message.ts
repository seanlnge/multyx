import { Update } from "./update";

export default class Message {
    name: string;
    data: any;
    time: number;

    /**
     * Constructor for creating messages to send to client
     * @param name
     * @param data 
     */
    constructor(name: string, data: any) {
        this.name = name;
        this.data = data;
        this.time = Date.now();
    }

    // Send multyx client native instructions
    static Native(updates: Update[]) {
        const data = [];

        for(const update of updates) {
            data.push(update.raw());
        }

        return JSON.stringify(new Message('_', data));
    }

    // Create message for user
    static Create(name: string, data: any) {
        // Make sure "_" cannot be used as name
        if(name[0] == '*') name = '*' + name;
        if(name == '_') name = '*_';

        if(typeof data == 'function') {
            throw new Error('Multyx data must be JSON storable');
        }

        return JSON.stringify(new Message(name, data));
    }

    // Parse message from user
    static Parse(str: string) {
        const parsed = JSON.parse(str);
        return new Message(parsed.name, parsed.data);
    }
}