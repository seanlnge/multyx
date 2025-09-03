import { RawObject } from "../types";

export interface EditUpdate {
    team: boolean;
    path: string[];
    value: any;
    instruction: 'edit';
}

export interface SelfUpdate {
    instruction: 'self';
    property: 'controller' | 'uuid' | 'constraint' | 'space';
    data: any;
}

export interface InputUpdate {
    instruction: 'input';
    input: string;
    data: any;
}

export interface ResponseUpdate {  
    instruction: 'resp';
    name: string;
    response: any;
}

export interface ConnectionUpdate {
    instruction: 'conn';
    uuid: string;
    publicData: RawObject;
}

export interface DisconnectUpdate {
    instruction: 'dcon';
    clientUUID: string;
}

export interface InitializeUpdate {
    instruction: 'init';
    client: RawObject;
    tps: number;
    constraintTable: RawObject;
    clients: RawObject;
    teams: RawObject;
    space: string;
}

/**
 * Compresses update into a string
 * [instruction][specifier]:[data]
 * @param update 
 * @returns Compressed update
 */
export function CompressUpdate(update: Update) {
    let code, pieces;
    if(update.instruction == 'edit') {
        code = update.team ? '1' : '0';
        pieces = [
            update.path.join('.'),
            JSON.stringify(update.value)
        ];
    }
    if(update.instruction == 'self') {
        if(update.property == 'controller') code = '2';
        else if(update.property == 'uuid') code = '3';
        else if(update.property == 'space') code = '9';
        else code = '4';
        pieces = [
            JSON.stringify(update.data)
        ];
    }
    if(update.instruction == 'resp') {
        code = '5';
        pieces = [
            update.name,
            JSON.stringify(update.response)
        ];
    }
    if(update.instruction == 'conn') {
        code = '6';
        pieces = [
            update.uuid,
            JSON.stringify(update.publicData)
        ];
    }
    if(update.instruction == 'dcon') {
        code = '7';
        pieces = [
            update.clientUUID
        ];
    }
    if(update.instruction == 'init') {
        code = '8';
        pieces = [
            JSON.stringify(update.client),
            update.tps.toString(),
            JSON.stringify(update.constraintTable),
            JSON.stringify(update.clients),
            JSON.stringify(update.teams),
            JSON.stringify(update.space)
        ];
    };

    if(!pieces) return '';
    let compressed = code;
    for(let i = 0; i < pieces.length; i++) {
        if(pieces[i] === undefined) pieces[i] = 'undefined';
        compressed += pieces[i].replace(/;/g, ';_');
        if(i < pieces.length - 1) compressed += ';,';
    }
    return compressed;
}

export function UncompressUpdate(str: string) {
    try {
        const [target, ...escapedData] = str.split(/;,/);
        const instruction = target[0];
        const specifier = target.slice(1).replace(/;_/g, ';');
        const data = escapedData.map(d => d.replace(/;_/g, ';')).map(d => d == "undefined" ? undefined : JSON.parse(d));

        if(instruction == '0') return {
            instruction: 'edit',
            team: false,
            path: specifier.split('.'),
            value: data[0]
        } as EditUpdate;
        if(instruction == '1') return {
            instruction: 'input',
            input: specifier, 
            data: data[0]
        } as InputUpdate;
        if(instruction == '2') return {
            instruction: 'resp',
            name: specifier,
            response: data[0]
        } as ResponseUpdate;
    } catch {
        return null;
    }
}

export type Update = EditUpdate | InputUpdate | SelfUpdate | ResponseUpdate | InitializeUpdate | ConnectionUpdate | DisconnectUpdate;