"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitializeUpdate = exports.DisconnectUpdate = exports.ConnectionUpdate = exports.EditUpdate = void 0;
class EditUpdate {
    constructor(clientUUID, path, value) {
        this.clientUUID = clientUUID;
        this.path = path;
        this.value = value;
    }
    raw() {
        return {
            instruction: 'edit',
            uuid: this.clientUUID,
            path: this.path,
            value: this.value
        };
    }
}
exports.EditUpdate = EditUpdate;
class ConnectionUpdate {
    constructor(clientUUID, publicData) {
        this.clientUUID = clientUUID;
        this.publicData = publicData;
    }
    raw() {
        return {
            instruction: 'conn',
            uuid: this.clientUUID,
            data: this.publicData
        };
    }
}
exports.ConnectionUpdate = ConnectionUpdate;
class DisconnectUpdate {
    constructor(clientUUID) {
        this.clientUUID = clientUUID;
    }
    raw() {
        return {
            instruction: 'conn',
            client: this.clientUUID
        };
    }
}
exports.DisconnectUpdate = DisconnectUpdate;
class InitializeUpdate {
    constructor(client, constraintTable, clients) {
        this.client = client;
        this.constraintTable = constraintTable;
        this.clients = clients;
    }
    raw() {
        return {
            instruction: 'init',
            client: this.client,
            constraintTable: this.constraintTable,
            clients: this.clients
        };
    }
}
exports.InitializeUpdate = InitializeUpdate;
