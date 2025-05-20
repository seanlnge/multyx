import { RawObject } from "../types";

export interface EditUpdate {
    team: boolean;
    path: string[];
    value: any;
    instruction: 'edit';
}

export interface SelfUpdate {
    instruction: 'self';
    property: 'controller' | 'uuid' | 'constraint';
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
}

/**
 * Compresses update into a string
 * [instruction][specifier]:[data]
 * @param update 
 * @returns 
 */
export function CompressUpdate(update: Update) {
    if(update.instruction == 'edit') {
        return `${update.team ? '1' : '0'}${update.path.join('.').replace(/;/g, ';;')};${JSON.stringify(update.value)}`;
    }
    if(update.instruction == 'self') {
        const code = update.property == 'controller' ? '2' : update.property == 'uuid' ? '3' : '4';
        return `${code}${JSON.stringify(update.data)}`;
    }
    if(update.instruction == 'resp') {
        return `5${update.name.replace(/;/g, ';;')};${JSON.stringify(update.response)}`;
    }
    if(update.instruction == 'conn') {
        return `6${update.uuid.replace(/;/g, ';;')};${JSON.stringify(update.publicData)}`;
    }
    if(update.instruction == 'dcon') {
        return `7${update.clientUUID.replace(/;/g, ';;')}`;
    }
    if(update.instruction == 'init') {
        const client = JSON.stringify(update.client).replace(/;/g, ';;');
        const constraintTable = JSON.stringify(update.constraintTable).replace(/;/g, ';;');
        const clients = JSON.stringify(update.clients).replace(/;/g, ';;');
        const teams = JSON.stringify(update.teams).replace(/;/g, ';;');
        return `8${client};${update.tps};${constraintTable};${clients};${teams}`;
    }
    return '';
}
export type Update = EditUpdate | SelfUpdate | ResponseUpdate | InitializeUpdate | ConnectionUpdate | DisconnectUpdate;