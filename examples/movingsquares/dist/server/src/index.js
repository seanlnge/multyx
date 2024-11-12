"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultyxServer = exports.MultyxTeam = exports.MultyxObject = exports.MultyxValue = exports.Controller = exports.Input = exports.Client = void 0;
const ws_1 = require("ws");
const client_1 = require("./client");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return client_1.Client; } });
Object.defineProperty(exports, "Input", { enumerable: true, get: function () { return client_1.Input; } });
Object.defineProperty(exports, "Controller", { enumerable: true, get: function () { return client_1.Controller; } });
const update_1 = require("./update");
const multyx_1 = require("./multyx");
Object.defineProperty(exports, "MultyxValue", { enumerable: true, get: function () { return multyx_1.MultyxValue; } });
Object.defineProperty(exports, "MultyxObject", { enumerable: true, get: function () { return multyx_1.MultyxObject; } });
Object.defineProperty(exports, "MultyxTeam", { enumerable: true, get: function () { return multyx_1.MultyxTeam; } });
const event_1 = require("./event");
const message_1 = __importDefault(require("./message"));
const nanotimer_1 = __importDefault(require("nanotimer"));
const utils_1 = require("./utils");
class MultyxServer {
    constructor(server, options = {}) {
        var _a;
        this.Disconnect = "_disconnect";
        this.Connection = "_connection";
        this.events = new Map();
        this.tps = (_a = options.tps) !== null && _a !== void 0 ? _a : 20;
        this.all = multyx_1.MultyxClients;
        this.updates = new Map();
        this.lastFrame = Date.now();
        this.deltaTime = 0;
        const WSServer = new ws_1.WebSocketServer({ server });
        WSServer.on('connection', (ws) => {
            const client = this.initializeClient(ws);
            this.updates.set(client, []);
            // Find all public data shared to client and compile into raw data
            const publicToClient = new Map();
            publicToClient.set(client, client.self.raw);
            for (const team of client.teams) {
                const clients = team.getRawPublic();
                for (const [c, curr] of clients) {
                    if (c === client)
                        continue;
                    const prev = publicToClient.get(c);
                    if (!prev) {
                        publicToClient.set(c, curr);
                        continue;
                    }
                    publicToClient.set(c, (0, utils_1.MergeRawObjects)(curr, prev));
                }
            }
            const rawClients = (0, utils_1.MapToObject)(publicToClient, c => c.uuid);
            ws.send(message_1.default.Native([new update_1.InitializeUpdate(client.parse(), client.self._buildConstraintTable(), rawClients)]));
            // Find all public data client shares and compile into raw data
            const clientToPublic = new Map();
            this.all.clients.forEach(c => clientToPublic.set(c, c.self.getRawPublic(this.all)));
            for (const team of client.teams) {
                const publicData = client.self.getRawPublic(team);
                for (const c of team.clients) {
                    if (c === client)
                        continue;
                    clientToPublic.set(c, (0, utils_1.MergeRawObjects)(clientToPublic.get(c), publicData));
                }
            }
            for (const c of this.all.clients) {
                if (c === client)
                    continue;
                this.addOperation(c, new update_1.ConnectionUpdate(client.uuid, clientToPublic.get(c)));
            }
            ws.on('message', (str) => {
                const msg = message_1.default.Parse(str);
                if (msg.native) {
                    this.parseNativeMessage(msg, client);
                }
            });
            ws.on('close', () => {
                var _a;
                (_a = this.events.get(this.Disconnect)) === null || _a === void 0 ? void 0 : _a.forEach(event => event.call(client));
                for (const t of client.teams)
                    t.removeClient(client);
                for (const c of this.all.clients) {
                    if (c === client)
                        continue;
                    this.addOperation(c, new update_1.DisconnectUpdate(client.uuid));
                }
            });
        });
        // Loop send updates
        (new nanotimer_1.default()).setInterval(this.sendUpdates.bind(this), [], Math.round(1000 / this.tps) + "m");
    }
    on(event, callback) {
        if (!this.events.has(event))
            this.events.set(event, []);
        const eventObj = new event_1.Event(event, callback);
        this.events.get(event).push(eventObj);
        return eventObj;
    }
    /**
     * Apply a function to all connected clients, and all clients that will ever be connected
     * @param callback
     */
    forAll(callback) {
        for (const client of this.all.clients) {
            callback(client);
        }
        this.on(this.Connection, callback);
    }
    initializeClient(ws) {
        var _a;
        const client = new client_1.Client(ws, this);
        (_a = this.events.get(this.Connection)) === null || _a === void 0 ? void 0 : _a.forEach(event => event.call(client));
        multyx_1.MultyxClients.addClient(client);
        return client;
    }
    parseNativeMessage(msg, client) {
        switch (msg.data.instruction) {
            case 'edit': return this.parseEditUpdate(msg, client);
            case 'input': return client.controller.parseUpdate(msg);
        }
    }
    parseEditUpdate(msg, client) {
        const path = msg.data.path.slice(0, -1);
        const prop = msg.data.path.slice(-1)[0];
        // Get obj being edited by going through property tree
        let obj = client.self;
        for (const p of path) {
            obj = obj.get(p);
            if (!obj || (obj instanceof multyx_1.MultyxValue))
                return;
        }
        // Verify value exists
        if (!obj.has(prop))
            return;
        if (typeof msg.data.value == 'object')
            return;
        const mv = obj.get(prop);
        // Set value and verify completion
        const valid = mv.set(new utils_1.EditWrapper(msg.data.value));
        // If change rejected
        if (!valid) {
            return this.addOperation(client, new update_1.EditUpdate(client.uuid, msg.data.path, mv.value));
        }
    }
    editUpdate(value, clients) {
        const update = new update_1.EditUpdate(value.client.uuid, value.propertyPath, value instanceof multyx_1.MultyxValue ? value.value : value.raw);
        for (const client of clients) {
            this.addOperation(client, update);
        }
    }
    addOperation(client, update) {
        var _a;
        const updates = (_a = this.updates.get(client)) !== null && _a !== void 0 ? _a : [];
        updates.push(update);
        this.updates.set(client, updates);
    }
    sendUpdates() {
        var _a;
        this.deltaTime = (Date.now() - this.lastFrame) / 1000;
        this.lastFrame = Date.now();
        for (const client of multyx_1.MultyxClients.clients) {
            (_a = client.onUpdate) === null || _a === void 0 ? void 0 : _a.call(client, this.deltaTime, client.controller.state);
        }
        for (const client of multyx_1.MultyxClients.clients) {
            const updates = this.updates.get(client);
            if (!(updates === null || updates === void 0 ? void 0 : updates.length))
                continue;
            this.updates.set(client, []);
            const msg = message_1.default.Native(updates);
            client.ws.send(msg);
        }
    }
}
exports.MultyxServer = MultyxServer;