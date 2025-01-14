import { Update } from "./update";

export default class Message {
    name: string;
    data: any;
    time: number;
    native: boolean;

    /**
     * Constructor for creating messages to send to client
     * @param name
     * @param data 
     */
    private constructor(name: string, data: any, native: boolean = false) {
        this.name = name;
        this.data = data;
        this.time = Date.now();
        this.native = native;
    }

    // Send multyx client native instructions
    static Native(updates: Update[]) {
        const data = [];

        for(const update of updates) {
            data.push(update.raw());
        }

        return JSON.stringify(new Message('_', data, true));
    }

    // Create message for user
    static Create(name: string, data: any) {
        if(name.length == 0) throw new Error('Multyx message cannot have empty name');
        if(name[0] == '_') name = '_' + name;

        if(typeof data == 'function') {
            throw new Error('Multyx data must be JSON storable');
        }

        return JSON.stringify(new Message(name, data));
    }

    // Create response message for user
    static Response(name: string, response: any) {
        const body = { instruction: 'resp', name, response };
        return JSON.stringify(new Message('_', [body], true));
    }

    // Parse message from user
    static Parse(str: string) {
        const parsed = JSON.parse(str);
        if(parsed.name[0] == '_') parsed.name = parsed.name.slice(1);
        return new Message(parsed.name, parsed.data, parsed.name == '');
    }
}