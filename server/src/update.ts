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

export class DisconnectUpdate {
    clientUUID: string;

    constructor(clientUUID: string) {
        this.clientUUID = clientUUID;
    }

    raw(): RawObject {
        return {
            instruction: 'conn',
            client: this.clientUUID
        }
    }
}

export class InitializeUpdate {
    client: RawObject;
    constraintTable: RawObject;
    clients: RawObject;
    teams: RawObject;
    all: string;

    constructor(client: RawObject, constraintTable: RawObject, clients: RawObject, teams: RawObject, all: string) {
        this.client = client;
        this.constraintTable = constraintTable;
        this.clients = clients;
        this.teams = teams;
        this.all = all;
    }

    raw(): RawObject {
        return {
            instruction: 'init',
            client: this.client,
            constraintTable: this.constraintTable,
            clients: this.clients,
            teams: this.teams,
            all: this.all
        }
    }
}

export type Update = EditUpdate | InitializeUpdate | ConnectionUpdate | DisconnectUpdate;