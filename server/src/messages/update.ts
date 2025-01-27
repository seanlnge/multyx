import { RawObject } from "../types";

export class EditUpdate {
    instruction: 'edit' = 'edit';
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
            instruction: this.instruction,
            team: this.team,
            path: this.path,
            value: this.value
        }
    }
}

export class SelfUpdate {
    instruction: 'self' = 'self';
    static Properties = ['controller', 'uuid', 'constraint'] as const;

    property: typeof SelfUpdate.Properties[number];
    data: any;

    /**
     * Used if client metadata is being changed, such as 
     * changing which inputs the controller is listening to
     * @param property Property of client metadata being altered
     * @param data Data to put in place of client property
     */
    constructor(property: typeof SelfUpdate.Properties[number], data: any) {
        this.property = property;
        this.data = data;
    }

    raw(): RawObject {
        return {
            instruction: this.instruction,
            prop: this.property,
            data: this.data
        }
    }
}

export class ResponseUpdate {
    instruction: 'resp' = 'resp';
    name: string;
    response: any;

    constructor(eventName: string, response: any) {
        this.name = eventName;
        this.response = response;
    }

    raw(): RawObject {
        return {
            instruction: this.instruction,
            name: this.name,
            response: this.response
        }
    }
}

export class ConnectionUpdate {
    instruction: 'conn' = 'conn';
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
            instruction: this.instruction,
            uuid: this.uuid,
            data: this.publicData
        }
    }
}

export class DisconnectUpdate {
    instruction: 'dcon' = 'dcon';
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
            instruction: this.instruction,
            client: this.clientUUID
        }
    }
}

export class InitializeUpdate {
    instruction: 'init' = 'init';
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
            instruction: this.instruction,
            client: this.client,
            constraintTable: this.constraintTable,
            clients: this.clients,
            teams: this.teams
        }
    }
}

export type Update = EditUpdate | SelfUpdate | ResponseUpdate | InitializeUpdate | ConnectionUpdate | DisconnectUpdate;