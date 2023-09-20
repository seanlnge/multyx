import { RawObject, Value } from "./types";

export class EditUpdate {
    clientUUID: string;
    path: string[];
    value: any;

    constructor(clientUUID: string, path: string[], value: any) {
        this.clientUUID = clientUUID;
        this.path = path;
        this.value = value;
    }

    raw(): RawObject {
        return {
            instruction: 'edit',
            uuid: this.clientUUID,
            path: this.path,
            value: this.value
        }
    }
}

export class ConnectionUpdate {
    clientUUID: string;
    publicData: RawObject;

    constructor(clientUUID: string, publicData: RawObject) {
        this.clientUUID = clientUUID;
        this.publicData = publicData;
    }

    raw(): RawObject {
        return {
            instruction: 'conn',
            uuid: this.clientUUID,
            data: this.publicData
        }
    }
}

export class InitializeUpdate {
    client: RawObject;
    constraintTable: RawObject;
    clients: RawObject;
    server: RawObject;

    constructor(client: RawObject, constraintTable: RawObject, clients: RawObject, serverData: RawObject) {
        this.client = client;
        this.constraintTable = constraintTable;
        this.clients = clients;
        this.server = serverData;
    }

    raw(): RawObject {
        return {
            instruction: 'init',
            client: this.client,
            constraintTable: this.constraintTable,
            clients: this.clients,
            server: this.server
        }
    }
}

export type Update = EditUpdate | InitializeUpdate | ConnectionUpdate;