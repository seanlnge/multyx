import { Update } from "./types";

export function UncompressUpdate(str: string) {
    const [target, ...escapedData] = str.split(/;,/);
    const instruction = target[0];
    const specifier = target.slice(1).replace(/;_/g, ';');
    const data = escapedData.map(d => d.replace(/;_/g, ';')).map(d => d == "undefined" ? undefined : JSON.parse(d));

    if(instruction == '0') return { instruction: 'edit', team: false, path: specifier.split('.'), value: data[0] };
    if(instruction == '1') return { instruction: 'edit', team: true, path: specifier.split('.'), value: data[0] };

    if(instruction == '2') return { instruction: 'self', property: "controller", data: JSON.parse(specifier) };
    if(instruction == '3') return { instruction: 'self', property: "uuid", data: JSON.parse(specifier) };
    if(instruction == '4') return { instruction: 'self', property: "constraint", data: JSON.parse(specifier) };
    if(instruction == '9') return { instruction: 'self', property: "space", data: JSON.parse(specifier) };

    if(instruction == '5') return { instruction: 'resp', name: specifier, response: data[0] };
    if(instruction == '6') return { instruction: 'conn', uuid: specifier, data: data[0] };
    if(instruction == '7') return { instruction: 'dcon', client: specifier };
    
    if(instruction == '8') return {
        instruction: 'init',
        client: JSON.parse(specifier),
        tps: data[0],
        constraintTable: data[1],
        clients: data[2],
        teams: data[3],
        space: data[4]
    };
}

export function CompressUpdate(update: Update) {
    let code, pieces;
    if(update.instruction == 'edit') {
        code = 0;
        pieces = [
            update.path.join('.'),
            JSON.stringify(update.value)
        ];
    } else if(update.instruction == 'input') {
        code = 1;
        pieces = [update.input, JSON.stringify(update.data)];
    } else if(update.instruction == 'resp') {
        code = 2;
        pieces = [update.name, JSON.stringify(update.response)];
    }

    if(!pieces || code === undefined) return '';
    let compressed = code.toString();
    for(let i = 0; i < pieces.length; i++) {
        compressed += pieces[i].replace(/;/g, ';_');
        if(i < pieces.length - 1) compressed += ';,';
    }
    return JSON.stringify([compressed]);
}

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

    static BundleOperations(deltaTime: number, operations: Update[]) {
        if(!Array.isArray(operations)) operations = [operations];
        return JSON.stringify(new Message('_', { operations, deltaTime }));
    }

    static Native(update: Update) {
        return CompressUpdate(update);
    }

    static Parse(str: string) {
        const parsed = JSON.parse(str);

        if(Array.isArray(parsed)) {
            return new Message('_', parsed, true);
        }

        return new Message(parsed.name ?? '', parsed.data ?? '', false);
    }

    static Create(name: string, data: any) {
        if(name.length == 0) throw new Error('Multyx message cannot have empty name');
        if(name[0] == '_') name = '_' + name;
        
        if(typeof data === 'function') {
            throw new Error('Multyx data must be JSON storable');
        }
        return JSON.stringify(new Message(name, data));
    }
}