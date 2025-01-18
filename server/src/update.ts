import { RawObject, Value } from "./types";
export class EditUpdate {
    team: boolean;
    path: string[];
    value: any;

    /**
     * Used if visible data is being edited
     * @param team Editing a team?
     * @param path Full path [uuid, ...path, property]
     * @param value Value of property
     */
    constructor(team: boolean, path: string[], value: any) {
        this.team = team;
        this.path = path;
        this.value = value;
    }

    raw(): RawObject {
        return {
            instruction: 'edit',
            team: this.team,
            path: this.path,
            value: this.value
        }
    }
}

export class PublicUpdate {
    visible: boolean;
    propertyPath: string[];
    value: Value;

    /**
     * Used if previous invisible data is now visible
     * @param team Team is now public?
     * @param uuid UUID of team or client
     * @param publicData Currently visible data
     */
    constructor(visible: boolean, propertyPath: string[], value: Value) {
        this.visible = visible;
        this.propertyPath = propertyPath;
        this.value = value;
    }

    raw(): RawObject {
        return {
            instruction: 'publ',
            visible: this.visible,
            path: this.propertyPath,
            data: this.value
        }
    }
}

export class ConnectionUpdate {
    uuid: string;
    publicData: RawObject;

    /**
     * Used if new client connects
     * @param uuid UUID of new client
     * @param publicData Visible data
     */
    constructor(uuid: string, publicData: RawObject) {
        this.uuid = uuid;
        this.publicData = publicData;
    }

    raw(): RawObject {
        return {
            instruction: 'conn',
            uuid: this.uuid,
            data: this.publicData
        }
    }
}

export class DisconnectUpdate {
    clientUUID: string;

    /**
     * Used if client disconnects
     * @param clientUUID UUID of disconnected client
     */
    constructor(clientUUID: string) {
        this.clientUUID = clientUUID;
    }

    raw(): RawObject {
        return {
            instruction: 'dcon',
            client: this.clientUUID
        }
    }
}

export class InitializeUpdate {
    client: RawObject;
    constraintTable: RawObject;
    clients: RawObject;
    teams: RawObject;

    /**
     * Used when client first connecting
     * @param client All client data
     * @param constraintTable All client constraints
     * @param clients All visible data of other clients
     * @param teams All visible data of other teams
     */
    constructor(client: RawObject, constraintTable: RawObject, clients: RawObject, teams: RawObject) {
        this.client = client;
        this.constraintTable = constraintTable;
        this.clients = clients;
        this.teams = teams;
    }

    raw(): RawObject {
        return {
            instruction: 'init',
            client: this.client,
            constraintTable: this.constraintTable,
            clients: this.clients,
            teams: this.teams
        }
    }
}

export type Update = EditUpdate | InitializeUpdate | ConnectionUpdate | DisconnectUpdate;