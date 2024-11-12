"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultyxServer = exports.MultyxTeam = exports.MultyxObject = exports.MultyxValue = exports.Events = exports.Controller = exports.Input = exports.Client = void 0;
const ws_1 = require("ws");
const client_1 = require("./client");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return client_1.Client; } });
Object.defineProperty(exports, "MultyxTeam", { enumerable: true, get: function () { return client_1.MultyxTeam; } });
Object.defineProperty(exports, "Input", { enumerable: true, get: function () { return client_1.Input; } });
Object.defineProperty(exports, "Controller", { enumerable: true, get: function () { return client_1.Controller; } });
const update_1 = require("./update");
const multyx_1 = require("./multyx");
Object.defineProperty(exports, "MultyxValue", { enumerable: true, get: function () { return multyx_1.MultyxValue; } });
Object.defineProperty(exports, "MultyxObject", { enumerable: true, get: function () { return multyx_1.MultyxObject; } });
const event_1 = require("./event");
Object.defineProperty(exports, "Events", { enumerable: true, get: function () { return event_1.Events; } });
const message_1 = __importDefault(require("./message"));
const nanotimer_1 = __importDefault(require("nanotimer"));
const utils_1 = require("./utils");
class MultyxServer {
    constructor(server, options = {}) {
        var _a;
        this.events = new Map();
        this.tps = (_a = options.tps) !== null && _a !== void 0 ? _a : 20;
        this.all = client_1.MultyxClients;
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
            const teams = {};
            for (const team of client.teams) {
                teams[team.uuid] = team.self.raw;
            }
            ws.send(message_1.default.Native([new update_1.InitializeUpdate(client.parse(), client.self._buildConstraintTable(), rawClients, teams, this.all.uuid)]));
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
                var _a, _b, _c;
                const msg = message_1.default.Parse(str);
                if (msg.native) {
                    this.parseNativeMessage(msg, client);
                    (_a = this.events.get(event_1.Events.Native)) === null || _a === void 0 ? void 0 : _a.forEach(cb => cb.call(client));
                }
                else {
                    (_b = this.events.get(event_1.Events.Custom)) === null || _b === void 0 ? void 0 : _b.forEach(cb => cb.call(client));
                    this.parseCustomMessage(msg, client);
                }
                (_c = this.events.get(event_1.Events.Any)) === null || _c === void 0 ? void 0 : _c.forEach(cb => cb.call(client));
            });
            ws.on('close', () => {
                var _a;
                (_a = this.events.get(event_1.Events.Disconnect)) === null || _a === void 0 ? void 0 : _a.forEach(event => event.call(client));
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
        this.on(event_1.Events.Connect, callback);
    }
    initializeClient(ws) {
        var _a;
        const client = new client_1.Client(ws, this);
        (_a = this.events.get(event_1.Events.Connect)) === null || _a === void 0 ? void 0 : _a.forEach(event => event.call(client));
        client_1.MultyxClients.addClient(client);
        return client;
    }
    parseCustomMessage(msg, client) {
        var _a;
        (_a = this.events.get(msg.name)) === null || _a === void 0 ? void 0 : _a.forEach(event => event.call(client, msg.data));
    }
    parseNativeMessage(msg, client) {
        var _a, _b;
        switch (msg.data.instruction) {
            case 'edit': {
                this.parseEditUpdate(msg, client);
                (_a = this.events.get(event_1.Events.Edit)) === null || _a === void 0 ? void 0 : _a.forEach(event => event.call(client, msg.data));
                break;
            }
            case 'input': {
                client.controller.__parseUpdate(msg);
                (_b = this.events.get(event_1.Events.Input)) === null || _b === void 0 ? void 0 : _b.forEach(event => event.call(client, client.controller.state));
                break;
            }
        }
    }
    parseEditUpdate(msg, client) {
        const path = msg.data.path.slice(0, -1);
        const prop = msg.data.path.slice(-1)[0];
        // Get obj being edited by going through property tree
        let obj;
        if (client.uuid === path[0]) {
            obj = client.self;
        }
        else {
            for (const team of client.teams)
                if (path[0] === team.uuid)
                    obj = team.self;
            if (!obj)
                return;
        }
        for (const p of path.slice(1)) {
            obj = obj.get(p);
            if (!obj || (obj instanceof multyx_1.MultyxValue))
                return;
        }
        // Verify value exists
        if (!obj.has(prop) && !(obj instanceof multyx_1.MultyxList))
            return;
        if (typeof msg.data.value == 'object')
            return;
        // Set value and verify completion
        const valid = obj instanceof multyx_1.MultyxList
            ? obj.set(prop, msg.data.value)
            : obj.get(prop).set(msg.data.value);
        // If change rejected
        if (!valid) {
            return this.addOperation(client, new update_1.EditUpdate(msg.data.path[0], msg.data.path.slice(1), obj.get(prop).value));
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
        var _a, _b, _c;
        this.deltaTime = (Date.now() - this.lastFrame) / 1000;
        this.lastFrame = Date.now();
        for (const client of client_1.MultyxClients.clients) {
            (_a = client.onUpdate) === null || _a === void 0 ? void 0 : _a.call(client, this.deltaTime, client.controller.state);
        }
        (_b = this.events.get(event_1.Events.Update)) === null || _b === void 0 ? void 0 : _b.forEach(event => event.call());
        for (const client of client_1.MultyxClients.clients) {
            const updates = this.updates.get(client);
            if (!(updates === null || updates === void 0 ? void 0 : updates.length))
                continue;
            this.updates.set(client, []);
            const msg = message_1.default.Native(updates);
            client.ws.send(msg);
        }
        (_c = this.events.get(event_1.Events.PostUpdate)) === null || _c === void 0 ? void 0 : _c.forEach(event => event.call());
    }
}
exports.MultyxServer = MultyxServer;
