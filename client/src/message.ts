import { Update } from "./types";

export class Message {
    name: string;
    data: any;
    time: number;
    native: boolean;

    private constructor(name: string, data: any, native: boolean = false) {
        this.name = name;
        this.data = data;
        this.time = Date.now();
        this.native = native;
    }

    static BundleOperations(deltaTime, operations) {
        if(!Array.isArray(operations)) operations = [operations];
        return JSON.stringify(new Message('_', { operations, deltaTime }));
    }

    static Native(update: Update) {
        return JSON.stringify(new Message('_', update, true));
    }

    static Parse(str: string) {
        const parsed = JSON.parse(str);
        if(parsed.name[0] == '_') parsed.name = parsed.name.slice(1);

        return new Message(parsed.name, parsed.data, parsed.name == '');
    }

    static Create(name, data) {
        if(name.length == 0) throw new Error('Multyx message cannot have empty name');
        if(name[0] == '_') name = '_' + name;
        
        if(typeof data === 'function') {
            throw new Error('Multyx data must be JSON storable');
        }
        return JSON.stringify(new Message(name, data));
    }
}