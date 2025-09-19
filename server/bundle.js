(() => {
    const defines = {};
    const entry = [null];
    function define(name, dependencies, factory) {
        defines[name] = { dependencies, factory };
        entry[0] = name;
    }
    define("require", ["exports"], (exports) => {
        Object.defineProperty(exports, "__cjsModule", { value: true });
        Object.defineProperty(exports, "default", { value: (name) => resolve(name) });
    });
    var __importDefault = (this && this.__importDefault) || function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };
    var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() { return m[k]; } };
        }
        Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    }));
    var __exportStar = (this && this.__exportStar) || function(m, exports) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
    };
    define("src/types", ["require", "exports"], function (require, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
    });
    define("src/utils/objects", ["require", "exports"], function (require, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.MergeRawObjects = MergeRawObjects;
        exports.MapToObject = MapToObject;
        /**
         * @example
         * ```js
         * const a = { a: 3, b: { c: 4 } };
         * const b = { d: 1, b: { e: 2 } };
         *
         * const merged = MergeRawObjects({ ...a }, { ...b });
         * console.log(merged); // { a: 3, b: { c: 4, e: 2 }, d: 1 }
         * ```
         * @param target any object
         * @param source any object
         * @returns merged object
         */
        function MergeRawObjects(target, source) {
            for (const key in source) {
                if (source[key] instanceof Object && target.hasOwnProperty(key) && target[key] instanceof Object) {
                    MergeRawObjects(target[key], source[key]);
                }
                else {
                    target[key] = source[key];
                }
            }
            return target;
        }
        /**
         * Turn Map<any, any> into RawObject
         *
         * coolest mf piece of code ive written it looks so cool wtf
         * @param target Map to transform into object
         * @param key Map key to string transform function
         * @param value Map value to object value transform function
         * @returns Transformed object
         */
        function MapToObject(target, key, value) {
            const entries = Array.from(target.entries()).map(([k, v]) => [
                key ? key(k) : k,
                value ? value(v) : v
            ]);
            const obj = {};
            for (const [k, v] of entries)
                obj[k] = v;
            return obj;
        }
    });
    define("src/messages/update", ["require", "exports"], function (require, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.CompressUpdate = CompressUpdate;
        exports.UncompressUpdate = UncompressUpdate;
        /**
         * Compresses update into a string
         * [instruction][specifier]:[data]
         * @param update
         * @returns Compressed update
         */
        function CompressUpdate(update) {
            let code, pieces;
            if (update.instruction == 'edit') {
                code = update.team ? '1' : '0';
                pieces = [
                    update.path.join('.'),
                    JSON.stringify(update.value)
                ];
            }
            if (update.instruction == 'self') {
                if (update.property == 'controller')
                    code = '2';
                else if (update.property == 'uuid')
                    code = '3';
                else if (update.property == 'space')
                    code = '9';
                else
                    code = '4';
                pieces = [
                    JSON.stringify(update.data)
                ];
            }
            if (update.instruction == 'resp') {
                code = '5';
                pieces = [
                    update.name,
                    JSON.stringify(update.response)
                ];
            }
            if (update.instruction == 'conn') {
                code = '6';
                pieces = [
                    update.uuid,
                    JSON.stringify(update.publicData)
                ];
            }
            if (update.instruction == 'dcon') {
                code = '7';
                pieces = [
                    update.clientUUID
                ];
            }
            if (update.instruction == 'init') {
                code = '8';
                pieces = [
                    JSON.stringify(update.client),
                    update.tps.toString(),
                    JSON.stringify(update.constraintTable),
                    JSON.stringify(update.clients),
                    JSON.stringify(update.teams),
                    JSON.stringify(update.space)
                ];
            }
            ;
            if (!pieces)
                return '';
            let compressed = code;
            for (let i = 0; i < pieces.length; i++) {
                if (pieces[i] === undefined)
                    pieces[i] = 'undefined';
                compressed += pieces[i].replace(/;/g, ';_');
                if (i < pieces.length - 1)
                    compressed += ';,';
            }
            return compressed;
        }
        function UncompressUpdate(str) {
            try {
                const [target, ...escapedData] = str.split(/;,/);
                const instruction = target[0];
                const specifier = target.slice(1).replace(/;_/g, ';');
                const data = escapedData.map(d => d.replace(/;_/g, ';')).map(d => d == "undefined" ? undefined : JSON.parse(d));
                if (instruction == '0')
                    return {
                        instruction: 'edit',
                        team: false,
                        path: specifier.split('.'),
                        value: data[0]
                    };
                if (instruction == '1')
                    return {
                        instruction: 'input',
                        input: specifier,
                        data: data[0]
                    };
                if (instruction == '2')
                    return {
                        instruction: 'resp',
                        name: specifier,
                        response: data[0]
                    };
            }
            catch (_a) {
                return null;
            }
        }
    });
    define("src/messages/message", ["require", "exports", "src/messages/update"], function (require, exports, update_1) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        class Message {
            /**
             * Constructor for creating messages to send to client
             * @param name
             * @param data
             */
            constructor(name, data, native = false) {
                this.name = name;
                this.data = data;
                this.time = Date.now();
                this.native = native;
            }
            // Send multyx client native instructions
            static Native(updates) {
                const data = [];
                for (const update of updates) {
                    data.push((0, update_1.CompressUpdate)(update));
                }
                return JSON.stringify(data);
            }
            static Create(name, data) {
                if (name.length == 0)
                    throw new Error('Multyx message cannot have empty name');
                if (name[0] == '_')
                    name = '_' + name;
                if (typeof data === 'function') {
                    throw new Error('Multyx data must be JSON storable');
                }
                return JSON.stringify(new Message(name, data));
            }
            // Parse message from user
            static Parse(str) {
                var _a, _b;
                try {
                    const parsed = JSON.parse(str);
                    if (Array.isArray(parsed))
                        return new Message('_', parsed[0], true);
                    return new Message((_a = parsed.name) !== null && _a !== void 0 ? _a : '', (_b = parsed.data) !== null && _b !== void 0 ? _b : '', false);
                }
                catch (_c) {
                    return null;
                }
            }
        }
        exports.default = Message;
    });
    /*
    
    Symbols used as class method identifiers to indicate privacy
    and disallow use outside of Multyx ecosystem
    
    */
    define("src/utils/native", ["require", "exports"], function (require, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.EditWrapper = exports.Remove = exports.Build = exports.Self = exports.Send = exports.Edit = exports.Value = exports.Get = exports.Parse = void 0;
        exports.Parse = Symbol("parse");
        exports.Get = Symbol("get");
        exports.Value = Symbol("value");
        exports.Edit = Symbol("edit");
        exports.Send = Symbol("send");
        exports.Self = Symbol("self");
        exports.Build = Symbol("build");
        exports.Remove = Symbol("remove");
        class EditWrapper {
            /**
             * Used when client is editing value
             * @param value Value to set
             */
            constructor(value) {
                this.value = value;
            }
        }
        exports.EditWrapper = EditWrapper;
    });
    define("src/messages/event", ["require", "exports", "src/utils/native"], function (require, exports, native_1) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.Event = exports.Events = void 0;
        exports.Events = {
            Connect: Symbol('connect'),
            Disconnect: Symbol('disconnect'),
            Update: Symbol('update'),
            PostUpdate: Symbol('postupdate'),
            Edit: Symbol('edit'),
            Input: Symbol('input'),
            Any: Symbol('any'),
            Native: Symbol('native'),
            Custom: Symbol('custom')
        };
        class Event {
            constructor(eventName, callback) {
                this.eventName = eventName;
                this.callback = callback;
                this.saveHistory = false;
                this.history = [];
            }
            call(client = undefined, data = {}) {
                const result = this.callback(client, data);
                if (this.saveHistory)
                    this.history.push({ time: Date.now(), client, data, result });
                if (result !== undefined && client && typeof this.eventName == 'string') {
                    client.server[native_1.Send](client, this.eventName, result);
                }
            }
            delete() {
                this.callback = I => I;
            }
        }
        exports.Event = Event;
    });
    define("src/options", ["require", "exports"], function (require, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.DefaultOptions = void 0;
        exports.DefaultOptions = {
            tps: 10,
            port: 8443,
            removeDisconnectedClients: true,
            respondOnFrame: true,
            sendConnectionUpdates: true,
            websocketOptions: {
                perMessageDeflate: false // Often causes backpressure on client
            },
        };
    });
    define("src/index", ["require", "exports", "ws", "nanotimer", "src/utils/objects", "src/messages/message", "./agents", "./items", "src/messages/update", "src/messages/event", "src/utils/native", "src/options"], function (require, exports, ws_1, nanotimer_1, objects_1, message_1, agents_1, items_1, update_2, event_1, native_2, options_1) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.MultyxServer = exports.MultyxTeam = exports.MultyxItem = exports.MultyxObject = exports.MultyxList = exports.MultyxValue = exports.Events = exports.ControllerState = exports.Controller = exports.Input = exports.Client = void 0;
        nanotimer_1 = __importDefault(nanotimer_1);
        message_1 = __importDefault(message_1);
        Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return agents_1.Client; } });
        Object.defineProperty(exports, "Input", { enumerable: true, get: function () { return agents_1.Input; } });
        Object.defineProperty(exports, "Controller", { enumerable: true, get: function () { return agents_1.Controller; } });
        Object.defineProperty(exports, "ControllerState", { enumerable: true, get: function () { return agents_1.ControllerState; } });
        Object.defineProperty(exports, "MultyxTeam", { enumerable: true, get: function () { return agents_1.MultyxTeam; } });
        Object.defineProperty(exports, "MultyxItem", { enumerable: true, get: function () { return items_1.MultyxItem; } });
        Object.defineProperty(exports, "MultyxList", { enumerable: true, get: function () { return items_1.MultyxList; } });
        Object.defineProperty(exports, "MultyxObject", { enumerable: true, get: function () { return items_1.MultyxObject; } });
        Object.defineProperty(exports, "MultyxValue", { enumerable: true, get: function () { return items_1.MultyxValue; } });
        Object.defineProperty(exports, "Events", { enumerable: true, get: function () { return event_1.Events; } });
        class MultyxServer {
            constructor(options = {}, callback) {
                if (typeof options == 'function') {
                    callback = options;
                    options = {};
                }
                this.options = Object.assign(Object.assign({}, options_1.DefaultOptions), options);
                this.options.websocketOptions = Object.assign(Object.assign({}, options_1.DefaultOptions.websocketOptions), options.websocketOptions);
                if (this.options.server && this.options.port)
                    delete this.options.port;
                if (this.options.port)
                    this.options.websocketOptions.port = this.options.port;
                if (this.options.server)
                    this.options.websocketOptions.server = this.options.server;
                this.events = new Map();
                this.tps = this.options.tps;
                this.all = new agents_1.MultyxTeam('all');
                this.updates = new Map();
                this.lastFrame = Date.now();
                this.deltaTime = 0;
                this.ws = new WeakMap();
                const WSServer = new ws_1.WebSocketServer(Object.assign({}, this.options.websocketOptions), callback);
                WSServer.on('connection', (ws) => {
                    const client = this.connectionSetup(ws);
                    this.ws.set(client, ws);
                    ws.on('message', (str) => {
                        var _a, _b, _c;
                        if (!client)
                            return;
                        const msg = message_1.default.Parse(str);
                        if (msg == null)
                            return client.warnings++;
                        if (msg.native) {
                            const update = (0, update_2.UncompressUpdate)(msg.data);
                            if (update == null) {
                                client.warnings++;
                                return;
                            }
                            this.parseNativeMessage(update, client);
                            (_a = this.events.get(event_1.Events.Native)) === null || _a === void 0 ? void 0 : _a.forEach(cb => cb.call(client, update));
                        }
                        else {
                            (_b = this.events.get(event_1.Events.Custom)) === null || _b === void 0 ? void 0 : _b.forEach(cb => cb.call(client, msg.data));
                            this.parseCustomMessage(msg, client);
                        }
                        (_c = this.events.get(event_1.Events.Any)) === null || _c === void 0 ? void 0 : _c.forEach(cb => cb.call(client));
                    });
                    ws.on('close', () => {
                        var _a;
                        if (!client)
                            return;
                        this.ws.delete(client);
                        this.updates.delete(client);
                        (_a = this.events.get(event_1.Events.Disconnect)) === null || _a === void 0 ? void 0 : _a.forEach(event => event.call(client));
                        if (this.options.removeDisconnectedClients) {
                            for (const t of client.teams)
                                t.removeClient(client);
                        }
                        this.all.removeClient(client);
                        if (this.options.sendConnectionUpdates) {
                            for (const c of this.all.clients) {
                                if (c === client)
                                    continue;
                                this.addOperation(c, { instruction: 'dcon', clientUUID: client.uuid });
                            }
                        }
                    });
                });
                // Loop send updates
                (new nanotimer_1.default()).setInterval(this.sendUpdates.bind(this), [], Math.round(1000 / this.tps) + "m");
            }
            /**
             * Setup connection between server and client, including
             * sending client all initialization information, and relaying
             * public information to all other clients
             *
             * @param ws Websocket object from connection
             * @returns Client object
             */
            connectionSetup(ws) {
                var _a;
                const client = new agents_1.Client(this);
                (_a = this.events.get(event_1.Events.Connect)) === null || _a === void 0 ? void 0 : _a.forEach(event => event.call(client));
                this.all.addClient(client);
                // Find all public data shared to client and compile into raw data
                const publicToClient = new Map();
                publicToClient.set(client, client.self.relayedValue);
                for (const team of client.teams) {
                    const clients = team[native_2.Get]();
                    for (const [c, curr] of clients) {
                        if (c === client)
                            continue;
                        const prev = publicToClient.get(c);
                        if (!prev) {
                            publicToClient.set(c, curr);
                            continue;
                        }
                        publicToClient.set(c, (0, objects_1.MergeRawObjects)(curr, prev));
                    }
                }
                const rawClients = (0, objects_1.MapToObject)(publicToClient, c => c.uuid);
                const teams = {};
                for (const team of client.teams) {
                    teams[team.uuid] = team.self.relayedValue;
                }
                // Build table of constraints for client-side prediction
                const constraintTable = { [client.uuid]: client.self[native_2.Build]() };
                for (const team of client.teams)
                    constraintTable[team.uuid] = team.self[native_2.Build]();
                // Only time InitializeUpdate is called, to setup client
                ws.send(message_1.default.Native([{
                        instruction: 'init',
                        client: client[native_2.Parse](),
                        tps: this.tps,
                        constraintTable,
                        clients: rawClients,
                        teams,
                        space: "default"
                    }]));
                // Clear any updates, all data was already sent in InitializeUpdate
                this.updates.set(client, []);
                // Find all public data client shares and compile into raw data
                const clientToPublic = new Map();
                this.all.clients.forEach(c => clientToPublic.set(c, c.self[native_2.Get](this.all)));
                for (const team of client.teams) {
                    const publicData = client.self[native_2.Get](team);
                    for (const c of team.clients) {
                        if (c === client)
                            continue;
                        clientToPublic.set(c, (0, objects_1.MergeRawObjects)(clientToPublic.get(c), publicData));
                    }
                }
                if (!this.options.sendConnectionUpdates)
                    return client;
                // Send connection update and public data to all other clients
                for (const c of this.all.clients) {
                    if (c === client)
                        continue;
                    this.addOperation(c, {
                        instruction: 'conn',
                        uuid: client.uuid,
                        publicData: clientToPublic.get(c)
                    });
                }
                return client;
            }
            parseCustomMessage(msg, client) {
                var _a;
                (_a = this.events.get(msg.name)) === null || _a === void 0 ? void 0 : _a.forEach(event => event.call(client, msg.data));
            }
            parseNativeMessage(update, client) {
                var _a, _b, _c, _d;
                switch (update.instruction) {
                    case 'edit': {
                        this.parseEditUpdate(update, client);
                        (_a = this.events.get(event_1.Events.Edit)) === null || _a === void 0 ? void 0 : _a.forEach(event => event.call(client, update));
                        break;
                    }
                    case 'input': {
                        client.controller[native_2.Parse](update);
                        (_b = this.events.get(event_1.Events.Input)) === null || _b === void 0 ? void 0 : _b.forEach(event => event.call(client, client.controller.state));
                        break;
                    }
                    case 'resp': {
                        const promises = (_c = this.events.get(Symbol.for("_" + update.name))) !== null && _c !== void 0 ? _c : [];
                        this.events.delete(Symbol.for("_" + update.name));
                        promises.forEach(event => event.call(client, update.response));
                        const events = (_d = this.events.get(update.name)) !== null && _d !== void 0 ? _d : [];
                        events.forEach(event => event.call(client, update.response));
                        break;
                    }
                }
            }
            parseEditUpdate(update, client) {
                var _a;
                const path = update.path.slice(1, -1);
                const prop = update.path.slice(-1)[0];
                // First value in path array is client uuid / team name
                const agent = client.uuid === update.path[0]
                    ? client
                    : Array.from(client.teams).find(t => t.uuid === update.path[0]);
                if (!agent)
                    return;
                const item = agent.self.get(path);
                if (!item || (item instanceof items_1.MultyxValue))
                    return;
                const result = item.set(prop, update.value);
                // Setting object adds an editUpdate to client update list, this removes the redundancy
                if (result) {
                    const clientUpdates = (_a = this.updates.get(client)) !== null && _a !== void 0 ? _a : [];
                    const index = clientUpdates.findIndex(pushed => {
                        if (pushed.instruction != 'edit')
                            return false;
                        if (pushed.path.every((v, i) => update.path[i] == v)
                            && pushed.value == update.value)
                            return true;
                        return false;
                    });
                    if (index != -1)
                        clientUpdates === null || clientUpdates === void 0 ? void 0 : clientUpdates.splice(index, 1);
                }
                // If change rejected
                else {
                    return this.addOperation(client, {
                        instruction: 'edit',
                        team: agent instanceof agents_1.MultyxTeam,
                        path: [...update.path],
                        value: item.value
                    });
                }
            }
            addOperation(client, update) {
                var _a;
                const updates = (_a = this.updates.get(client)) !== null && _a !== void 0 ? _a : [];
                updates.push(update);
                this.updates.set(client, updates);
            }
            /**
             * Turn update list into smaller update list by combining data
             * from the same MultyxObject
             * @param updates List of updates to compress
             * @returns Compressed updates
             */
            compressUpdates(updates) {
                const compressed = [];
                const pathToEdit = new Map();
                const pathToSelf = new Map();
                for (const update of updates) {
                    // If just connected, all updates accounted for inside conn update
                    if (update.instruction == 'init') {
                        compressed.length = 0;
                        compressed.push(update);
                    }
                    // Replace old edits on same property
                    else if (update.instruction == 'edit') {
                        if (update.value == Symbol.for("_remove")) {
                            pathToEdit.delete(update.path.join(' '));
                            continue;
                        }
                        // Property path references are same across updates
                        pathToEdit.set(update.path.join(' '), update);
                    }
                    // Replace old self edits on same property
                    else if (update.instruction == 'self') {
                        // Self updates send entire value, not just changes
                        pathToSelf.set(update.property, update);
                    }
                    // All other updates cannot be compressed / not worth it
                    else {
                        compressed.push(update);
                    }
                }
                // Update order doesn't matter, client callbacks called after update cycle
                for (const value of pathToEdit.values())
                    compressed.push(value);
                for (const value of pathToSelf.values())
                    compressed.push(value);
                return compressed;
            }
            /**
             * Send all updates in past frame to clients
             */
            sendUpdates() {
                var _a, _b, _c;
                this.deltaTime = (Date.now() - this.lastFrame) / 1000;
                this.lastFrame = Date.now();
                for (const client of this.all.clients) {
                    (_a = client.onUpdate) === null || _a === void 0 ? void 0 : _a.call(client, this.deltaTime, client.controller.state);
                }
                (_b = this.events.get(event_1.Events.Update)) === null || _b === void 0 ? void 0 : _b.forEach(event => event.call());
                for (const client of this.all.clients) {
                    const rawUpdates = this.updates.get(client);
                    if (!(rawUpdates === null || rawUpdates === void 0 ? void 0 : rawUpdates.length))
                        continue;
                    const updates = this.compressUpdates(rawUpdates);
                    const ws = this.ws.get(client);
                    if (!ws)
                        continue;
                    // Client is backpressured and cannot currently be sent more data
                    // without ws._sender._queue being stuffed and the heap growing to 1GB+
                    if (ws.bufferedAmount > 4 * 1024 * 1024) {
                        client.networkIssues++;
                        continue;
                    }
                    const msg = message_1.default.Native(updates);
                    client.updateSize = msg.length;
                    ws.send(msg);
                    // Clear updates
                    rawUpdates.length = 0;
                }
                (_c = this.events.get(event_1.Events.PostUpdate)) === null || _c === void 0 ? void 0 : _c.forEach(event => event.call());
            }
            /**
             * Create an EditUpdate event to send to list of clients
             * @param item MultyxItem to relay state of
             * @param clients Set of all clients to relay event to
             */
            [native_2.Edit](item, clients) {
                const update = {
                    instruction: 'edit',
                    team: item.agent instanceof agents_1.MultyxTeam,
                    path: item.propertyPath,
                    value: item.relayedValue
                };
                for (const client of clients) {
                    this.addOperation(client, update);
                }
            }
            /**
             * Create an EditUpdate event to remove an item from update
             * @param item MultyxItem to relay state of
             * @param clients Set of all clients to relay event to
             */
            [native_2.Remove](item, clients) {
                for (const client of clients) {
                    this.addOperation(client, {
                        instruction: 'edit',
                        team: item.agent instanceof agents_1.MultyxTeam,
                        path: item.propertyPath,
                        value: Symbol.for("_remove")
                    });
                }
            }
            /**
             * Create a SelfUpdate event to send to client
             * @param property Self property being updated
             */
            [native_2.Self](client, property, data) {
                this.addOperation(client, {
                    instruction: 'self',
                    property,
                    data
                });
            }
            /**
             * Send message to client
             * @param client Client to send to
             * @param message Message to send
             */
            [native_2.Build](client, message) {
                var _a;
                (_a = this.ws.get(client)) === null || _a === void 0 ? void 0 : _a.send(message);
            }
            /**
             * Create a ResponseUpdate to respond to client
             * @param client Client to send response to
             * @param eventName Name of event responding to
             * @param response Response
             */
            [native_2.Send](client, eventName, response) {
                var _a;
                // Wait until next frame to send response?
                if (this.options.respondOnFrame) {
                    this.addOperation(client, {
                        instruction: 'resp',
                        name: eventName,
                        response
                    });
                }
                else {
                    (_a = this.ws.get(client)) === null || _a === void 0 ? void 0 : _a.send(message_1.default.Native([{
                            instruction: 'resp',
                            name: eventName,
                            response
                        }]));
                }
            }
            /* All public methods for user use */
            /**
             * Create an event listener for any MultyxEvents
             * @param event
             * @param callback
             * @returns Event listener object
             */
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
        }
        exports.MultyxServer = MultyxServer;
    });
    define("index", ["require", "exports", "src/index"], function (require, exports, index_1) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        __exportStar(index_1, exports);
    });
    define("src/utils/uuid", ["require", "exports"], function (require, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.GenerateUUID = GenerateUUID;
        exports.AddUUID = AddUUID;
        const UUIDSet = new Set();
        /**
         * Generate a unique identifier across Multyx ecosystem
         * @param length Length of UUID
         * @param radix Base number to use for UUID characters
         * @returns
         */
        function GenerateUUID(length = 8, radix = 36) {
            const unit = radix ** (length - 1);
            const uuid = Math.floor(Math.random() * (radix * unit - unit) + unit).toString(radix);
            if (UUIDSet.has(uuid))
                return GenerateUUID(length, radix);
            UUIDSet.add(uuid);
            return uuid;
        }
        /**
         * Add a UUID to the Multyx ecosystem global set
         * @param uuid UUID to add to set
         * @returns True if success, false if UUID already exists in set
         */
        function AddUUID(uuid) {
            if (UUIDSet.has(uuid))
                return false;
            UUIDSet.add(uuid);
            return true;
        }
    });
    define("src/agents/controller", ["require", "exports", "src/utils/native"], function (require, exports, native_3) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.Controller = exports.Input = void 0;
        var Input;
        (function (Input) {
            Input["MouseMove"] = "mousemove";
            Input["MouseDown"] = "mousedown";
            Input["MouseUp"] = "mouseup";
            Input["KeyDown"] = "keydown";
            Input["KeyHold"] = "keyhold";
            Input["KeyUp"] = "keyup";
            Input["KeyPress"] = "keypress";
            Input["Shift"] = "Shift";
            Input["Alt"] = "Alt";
            Input["Tab"] = "Tab";
            Input["Control"] = "Control";
            Input["Enter"] = "Enter";
            Input["Escape"] = "Escape";
            Input["Delete"] = "Delete";
            Input["Space"] = "Space";
            Input["CapsLock"] = "CapsLock";
            Input["LeftShift"] = "ShiftLeft";
            Input["RightShift"] = "ShiftRight";
            Input["LeftControl"] = "ControlLeft";
            Input["RightControl"] = "ControlRight";
            Input["LeftAlt"] = "AltLeft";
            Input["RightAlt"] = "AltRight";
            Input["UpArrow"] = "ArrowUp";
            Input["DownArrow"] = "ArrowDown";
            Input["LeftArrow"] = "ArrowLeft";
            Input["RightArrow"] = "ArrowRight";
        })(Input || (exports.Input = Input = {}));
        class Controller {
            constructor(client) {
                this.client = client;
                this.state = { keys: {}, mouse: { x: 0, y: 0, down: false } };
                this.listening = new Set();
                this.events = new Map();
            }
            /**
             * Listen to specific input channel from user
             * @param input Input to listen for; If type `string`, client listens for keyboard event code `input`
             * @example
             * ```js
             * client.controller.listenTo(["a", "d", Input.Shift, Input.MouseMove], (state) => {
             *     console.log("Client did an input");
             *     console.log(state.mouse.x, state.mouse.y);
             *
             *     if(state.keys["a"] && state.keys["d"]) {
             *         console.log("bro is NOT moving crying emoji skull emoji");
             *     }
             * });
             * ```
             */
            listenTo(input, callback) {
                if (!Array.isArray(input))
                    input = [input];
                input.forEach(inp => {
                    var _a;
                    this.listening.add(inp);
                    if (callback) {
                        const events = (_a = this.events.get(inp)) !== null && _a !== void 0 ? _a : [];
                        events.push(callback);
                        this.events.set(inp, events);
                    }
                });
                // Relay changes to client
                this.client.server[native_3.Self](this.client, 'controller', Array.from(this.listening));
            }
            /**
             * Parse an input update from client
             * @param msg Message containing input data
             */
            [native_3.Parse](update) {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
                switch (update.input) {
                    case Input.MouseDown: {
                        this.state.mouse.x = (_a = update.data) === null || _a === void 0 ? void 0 : _a.x;
                        this.state.mouse.y = (_b = update.data) === null || _b === void 0 ? void 0 : _b.y;
                        this.state.mouse.down = true;
                        (_c = this.events.get(Input.MouseDown)) === null || _c === void 0 ? void 0 : _c.forEach(c => c(this.state));
                        break;
                    }
                    case Input.MouseUp: {
                        this.state.mouse.x = (_d = update.data) === null || _d === void 0 ? void 0 : _d.x;
                        this.state.mouse.y = (_e = update.data) === null || _e === void 0 ? void 0 : _e.y;
                        this.state.mouse.down = false;
                        (_f = this.events.get(Input.MouseUp)) === null || _f === void 0 ? void 0 : _f.forEach(c => c(this.state));
                        break;
                    }
                    case Input.MouseMove: {
                        this.state.mouse.x = (_g = update.data) === null || _g === void 0 ? void 0 : _g.x;
                        this.state.mouse.y = (_h = update.data) === null || _h === void 0 ? void 0 : _h.y;
                        (_j = this.events.get(Input.MouseMove)) === null || _j === void 0 ? void 0 : _j.forEach(c => c(this.state));
                        break;
                    }
                    case Input.KeyUp: {
                        delete this.state.keys[(_k = update.data) === null || _k === void 0 ? void 0 : _k.code];
                        (_l = this.events.get(Input.KeyUp)) === null || _l === void 0 ? void 0 : _l.forEach(c => c(this.state));
                        (_o = this.events.get((_m = update.data) === null || _m === void 0 ? void 0 : _m.code)) === null || _o === void 0 ? void 0 : _o.forEach(c => c(this.state));
                        break;
                    }
                    case Input.KeyDown: {
                        this.state.keys[(_p = update.data) === null || _p === void 0 ? void 0 : _p.code] = true;
                        (_q = this.events.get(Input.KeyDown)) === null || _q === void 0 ? void 0 : _q.forEach(c => c(this.state));
                        (_s = this.events.get((_r = update.data) === null || _r === void 0 ? void 0 : _r.code)) === null || _s === void 0 ? void 0 : _s.forEach(c => c(this.state));
                        break;
                    }
                    case Input.KeyHold: {
                        (_t = this.events.get(Input.KeyHold)) === null || _t === void 0 ? void 0 : _t.forEach(c => c(this.state));
                        break;
                    }
                    default: {
                        console.log('bro how tf you get here');
                    }
                }
            }
        }
        exports.Controller = Controller;
    });
    define("src/agents/team", ["require", "exports", "src/messages/message", "src/utils/uuid", "src/utils/native", "../items"], function (require, exports, message_2, uuid_1, native_4, items_2) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        message_2 = __importDefault(message_2);
        class MultyxTeam {
            get clients() {
                return Array.from(this._clients);
            }
            /**
             * Creates a group of clients sharing public data
             * @param clients List of clients to add to team
             * @returns MultyxTeam object
             */
            constructor(name, clients) {
                var _a, _b;
                this.public = new Set();
                this.uuid = name;
                if (!(0, uuid_1.AddUUID)(name))
                    throw new Error("MultyxTeam name must be unique");
                // Team comes pre-initialized with object of { [client.uuid]: client.self }
                this.self = new items_2.MultyxObject({}, this);
                this.self.clients = [];
                if (!clients) {
                    this._clients = new Set();
                    return;
                }
                this._clients = new Set();
                clients.forEach(c => {
                    this.self.clients.push(c.uuid);
                    c.teams.add(this);
                    this._clients.add(c);
                });
                this.server = (_b = (_a = this.clients.values().next().value) === null || _a === void 0 ? void 0 : _a.server) !== null && _b !== void 0 ? _b : this.server;
                this.server[native_4.Edit](this.self, this._clients);
            }
            /**
             * Send an event to all clients on team
             * @param eventName Name of client event
             * @param data Data to send
             */
            send(eventName, data) {
                const msg = message_2.default.Create(eventName, data);
                for (const client of this.clients) {
                    this.server[native_4.Build](client, msg);
                }
            }
            /**
             * Retrieve a client object in the team
             * @param uuid UUID of client to retrieve
             * @returns Client if exists in team, else null
             */
            getClient(uuid) {
                const client = Array.from(this.clients.values()).find(x => x.uuid == uuid);
                return client !== null && client !== void 0 ? client : null;
            }
            /**
             * Add a client into the team
             * @param client Client object to add to team
             */
            addClient(client) {
                if (this._clients.has(client))
                    return;
                if (!this.server)
                    this.server = client.server;
                this.self.clients.push(client.uuid);
                this._clients.add(client);
                client.teams.add(this);
                // Send public data of all clients to new client
                for (const mv of this.public) {
                    mv[native_4.Send](client);
                }
                this.server[native_4.Edit](this.self, new Set([client]));
            }
            /**
             * Remove a client from the team
             * @param client Client object to remove from team
             */
            removeClient(client) {
                if (!this._clients.has(client))
                    return;
                const index = this.self.clients.findIndex((c) => c == client.uuid);
                if (index !== -1)
                    this.self.clients.splice(index, 1);
                this._clients.delete(client);
                this.removePublic(client.self);
                client.teams.delete(this);
            }
            /**
             * Make item visible to team
             * @param item MultyxItem to make visible to all clients in team
             * @returns Same MultyxTeam object
             */
            addPublic(item) {
                if (item instanceof items_2.MultyxValue) {
                    if (this.public.has(item))
                        return this;
                    this.public.add(item);
                }
                item.addPublic(this);
                return this;
            }
            /**
             * Remove item visibility from team
             * @param item MultyxItem to remove visibility of
             * @returns Same MultyxTeam object
             */
            removePublic(item) {
                if (item instanceof items_2.MultyxValue) {
                    if (!this.public.has(item))
                        return this;
                    this.public.delete(item);
                }
                item.removePublic(this);
                return this;
            }
            /**
             * Get publicized data of all clients in team
             * @returns Map between client and publicized data
             */
            [native_4.Get]() {
                const parsed = new Map();
                this.clients.forEach(c => parsed.set(c, c.self[native_4.Get](this)));
                return parsed;
            }
        }
        exports.default = MultyxTeam;
    });
    define("src/agents/client", ["require", "exports", "src/messages/message", "src/utils/uuid", "../items", "src/utils/native", "src/agents/controller"], function (require, exports, message_3, uuid_2, items_3, native_5, controller_1) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        message_3 = __importDefault(message_3);
        class Client {
            constructor(server) {
                this.teams = new Set();
                this.server = server;
                this.uuid = (0, uuid_2.GenerateUUID)();
                this.warnings = 0;
                this.networkIssues = 0;
                this.joinTime = Date.now();
                this.clients = [this];
                this.updateSize = 0;
                this.self = new items_3.MultyxObject({}, this);
                this.controller = new controller_1.Controller(this);
                this.space = 'default';
            }
            on(eventName, callback) {
                this.server.on(eventName, (client, response) => {
                    if (client == this)
                        callback(response);
                });
            }
            send(eventName, data) {
                this.server[native_5.Build](this, message_3.default.Create(eventName, data));
            }
            await(eventName, data) {
                this.send(eventName, data);
                return new Promise((res) => this.on(eventName, res));
            }
            /**
             * Set the space of the client
             * @param space
             */
            setSpace(space) {
                this.space = space;
                this.server[native_5.Self](this, "space", space);
            }
            /**
             * Get the space of the client
             */
            getSpace() {
                return this.space;
            }
            /**
             * Create client-side representation of client object
             */
            [native_5.Parse]() {
                return {
                    uuid: this.uuid,
                    joinTime: this.joinTime,
                    controller: Array.from(this.controller.listening.values()),
                    self: this.self.relayedValue,
                    space: this.space,
                };
            }
        }
        exports.default = Client;
    });
    define("src/agents/index", ["require", "exports", "src/agents/client", "src/agents/team", "src/agents/controller"], function (require, exports, client_1, team_1, controller_2) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.MultyxTeam = exports.Input = exports.Controller = exports.Client = void 0;
        client_1 = __importDefault(client_1);
        team_1 = __importDefault(team_1);
        exports.Client = client_1.default;
        exports.MultyxTeam = team_1.default;
        Object.defineProperty(exports, "Controller", { enumerable: true, get: function () { return controller_2.Controller; } });
        Object.defineProperty(exports, "Input", { enumerable: true, get: function () { return controller_2.Input; } });
    });
    /*
    
    WARNING:
    
    This is an extremely fragile folder.
    
    This file and system of lazy-loading MultyxItems is necessary to
    circumvent circular dependencies.
    
    MultyxObject needs to be able to determine which MultyxItem to create for
    each child property that the object its mirroring. This requires the imports
    for all MultyxItems, however, any MultyxItems that extend from MultyxObject,
    such as MultyxList, create circular dependencies by extending a class that
    is importing themselves.
    
    This file was created to circumvent this issue by lazy-loading the MultyxItem
    that MultyxObject creates.
    
    
    For any future development of this folder, ensure that dependencies do not
    link to the index.ts file, but to the specific file containing the default
    export of that MultyxItem. The index.ts file is strictly meant for external
    access of MultyxItems from outside this folder. Similarly, no class within
    this folder should access anything but the type of classes outside of this
    folder.
    
    Any future MultyxItems that may be created should extend upwards from the
    base item MultyxObject, and lower-level nodes should never import any
    higher-level nodes, except for in this file, where they may be lazy-loaded.
    
    MultyxValue is also a fragile class, and any changes or extension classes of
    this MultyxItem should not import many dependencies at all.
    
    */
    define("src/items/router", ["require", "exports"], function (require, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.default = MultyxItemRouter;
        function MultyxItemRouter(data) {
            return Array.isArray(data) ? require('./list').default
                : typeof data == 'object' ? require('./object').default
                    : require('./value').default;
        }
    });
    define("src/items/list", ["require", "exports", ".", "src/utils/native", "src/items/router"], function (require, exports, _1, native_6, router_1) {
        "use strict";
        var _a;
        Object.defineProperty(exports, "__esModule", { value: true });
        router_1 = __importDefault(router_1);
        class MultyxList {
            get value() {
                return this.data.map((i) => i.value);
            }
            get relayedValue() {
                if (!this.relayed)
                    return [];
                return this.data.map((i) => i.relayedValue);
            }
            get length() {
                return this.data.length;
            }
            set length(length) {
                for (let i = length; i < this.data.length; i++) {
                    this.delete(i);
                }
            }
            sendShiftOperation(index, move) {
                if (!this.relayed)
                    return;
                if (index > 0) {
                    for (let i = index; i < this.length; i++) {
                        this.data[i][native_6.Self]([...this.propertyPath, (i + move).toString()], false);
                    }
                }
                new _1.MultyxValue(move, this.agent, [...this.propertyPath, 'shift', index.toString()]);
            }
            /**
             * Create a MultyxItem representation of an array
             * @param list Array to turn into MultyxObject
             * @param agent Client or MultyxTeam hosting this MultyxItem
             * @param propertyPath Entire path from agent to this MultyxList
             * @returns MultyxList
             */
            constructor(list, agent, propertyPath = [agent.uuid]) {
                this.writeCallbacks = [];
                this.toString = () => this.value.toString();
                this.valueOf = () => this.value;
                this[_a] = () => this.value;
                this.data = [];
                this.propertyPath = propertyPath;
                this.agent = agent;
                this.disabled = false;
                this.relayed = true;
                this.publicTeams = new Set();
                this.allowItemAddition = true;
                this.allowItemChange = true;
                this.allowItemDeletion = true;
                if (list instanceof MultyxList)
                    list = list.value;
                for (const item of list) {
                    this.data.push(new ((0, router_1.default)(item))(item, agent, [...propertyPath, this.data.length.toString()]));
                }
                if (this.constructor !== MultyxList)
                    return this;
                return new Proxy(this, {
                    has: (o, p) => {
                        if (typeof p === 'number')
                            return o.has(p);
                        return p in o;
                    },
                    // Allow users to access properties in MultyxObject without using get
                    get: (o, p) => {
                        if (p in o)
                            return o[p];
                        if (Number.isInteger(parseInt(p)))
                            p = parseInt(p);
                        return o.data[p];
                    },
                    // Allow users to set MultyxObject properties by client.self.a = b
                    set: (o, p, v) => {
                        if (p in o) {
                            o[p] = v;
                            return true;
                        }
                        return !!o.set(p, v);
                    },
                    // Allow users to delete MultyxObject properties by delete client.self.a;
                    deleteProperty(o, p) {
                        if (typeof p === 'number')
                            return !!o.delete(p);
                        return false;
                    }
                });
            }
            disable() {
                this.disabled = true;
                this.data.forEach((i) => i.disable());
                return this;
            }
            enable() {
                this.disabled = false;
                this.data.forEach((i) => i.enable());
                return this;
            }
            relay() {
                this.relayed = true;
                this.data.forEach((i) => i.relay());
                return this;
            }
            unrelay() {
                this.relayed = false;
                this.data.forEach((i) => i.unrelay());
                return this;
            }
            /**
             * Publicize MultyxValue from specific MultyxTeam
             * @param team MultyxTeam to share MultyxValue to
             * @returns Same MultyxValue
             */
            addPublic(team) {
                if (this.publicTeams.has(team))
                    return this;
                this.publicTeams.add(team);
                for (const prop in this.data)
                    this.data[prop].addPublic(team);
                return this;
            }
            /**
             * Privitize MultyxValue from specific MultyxTeam
             * @param team MultyxTeam to hide MultyxValue from
             * @returns Same MultyxValue
             */
            removePublic(team) {
                if (!this.publicTeams.has(team))
                    return this;
                this.publicTeams.delete(team);
                for (const prop in this.data)
                    this.data[prop].removePublic(team);
                return this;
            }
            has(index) {
                return index >= 0 && index < this.data.length;
            }
            /**
             * Get the value of a property
             */
            get(property) {
                if (typeof property === 'number')
                    return this.data[property];
                if (property.length == 0)
                    return this;
                if (property.length == 1)
                    return this.data[parseInt(property[0])];
                const next = this.data[parseInt(property[0])];
                if (!next || (next instanceof _1.MultyxValue))
                    return undefined;
                return next.get(property.slice(1));
            }
            /**
             * Set the value of the MultyxValue object of a property
             * @example
             * ```js
             * // Server
             * multyx.on('reset', client => client.player.set('x', 5));
             *
             * // Client
             * client.position[1] = 20 * Math.random();
             * multyx.send('reset');
             * console.log(client.position[1]); // 5
             * ```
             */
            set(index, value) {
                var _b, _c;
                if (typeof index === 'string')
                    index = parseInt(index);
                if (!Number.isInteger(index))
                    return false;
                if (value instanceof native_6.EditWrapper) {
                    if (!this.has(index) && this.disabled)
                        return false;
                    if (value.value === undefined && !this.allowItemDeletion)
                        return false;
                    if (!this.allowItemAddition && index >= this.length)
                        return false;
                    if (!this.allowItemChange && index < this.length)
                        return false;
                    value = value.value;
                }
                else if ((0, _1.IsMultyxItem)(value)) {
                    value = value.value;
                }
                // Deleting an element by setting MultyxList[index] = undefined
                if (value === undefined)
                    return this.delete(index);
                const propertyPath = [...this.propertyPath, index.toString()];
                if ((0, _1.IsMultyxItem)(value)) {
                    value[native_6.Self](propertyPath);
                    this.data[index] = value;
                }
                else {
                    this.data[index] = new ((0, router_1.default)(value))(value, this.agent, propertyPath);
                }
                this.data[index].disabled = this.disabled;
                this.data[index].relayed = this.relayed;
                const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + index);
                if ((_b = this.agent.server) === null || _b === void 0 ? void 0 : _b.events.has(propSymbol)) {
                    (_c = this.agent.server) === null || _c === void 0 ? void 0 : _c.events.get(propSymbol).forEach(event => event.call(undefined, this.data[index]));
                }
                return this;
            }
            delete(index) {
                if (typeof index === 'string')
                    index = parseInt(index);
                delete this.data[index];
                if (index == this.length - 1)
                    this.length = index;
                new _1.MultyxValue(undefined, this.agent, [...this.propertyPath, index.toString()]);
                return this;
            }
            await(index) {
                if (this.has(index))
                    return Promise.resolve(this.get(index));
                const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + index);
                return new Promise(res => { var _b; return (_b = this.agent.server) === null || _b === void 0 ? void 0 : _b.on(propSymbol, (_, v) => res(v)); });
            }
            /**
             * Create a callback that gets called whenever the object is edited
             * @param index Index to listen for writes on
             * @param callback Function to call whenever object is edited
             * @returns Event object representing write callback
             */
            onWrite(index, callback) {
                const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + "." + index.toString());
                return this.agent.server.on(propSymbol, (_, v) => callback(v));
            }
            /**
             * Get all properties in list publicized to specific team
             * @param team MultyxTeam to get public data for
             * @returns Raw object
             */
            [native_6.Get](team) {
                const parsed = [];
                for (const item of this.data) {
                    if (item instanceof _1.MultyxValue) {
                        if (item.isPublic(team)) {
                            parsed.push(item.value);
                        }
                        else {
                            parsed.push(undefined);
                        }
                    }
                    else {
                        if (!(native_6.Get in item)) {
                            parsed.push(undefined);
                        }
                        else {
                            parsed.push(item[native_6.Get](team));
                        }
                    }
                }
                return parsed;
            }
            /**
             * Build a constraint table
             * @returns Constraint table
             */
            [native_6.Build]() {
                if (!this.relayed)
                    return [];
                const obj = [];
                for (const item of this.data) {
                    if (!(native_6.Build in item))
                        continue;
                    obj.push(item[native_6.Build]());
                }
                return obj;
            }
            [native_6.Self](newPath) {
                this.propertyPath = newPath;
                for (const index in this.data) {
                    if (!(native_6.Self in this.data[index]))
                        continue;
                    this.data[index][native_6.Self]([...newPath, index]);
                }
            }
            push(...items) {
                this.data.push(...items.map((item, index) => new ((0, router_1.default)(item))(item, this.agent, [...this.propertyPath, (this.length + index).toString()])));
                return this.length;
            }
            pop() {
                if (this.length == 0)
                    return undefined;
                this.sendShiftOperation(-1, -1); // Delete last item
                return this.data.pop();
            }
            unshift(...items) {
                // Let client know that all items getting shifted right # of items being added
                this.sendShiftOperation(0, items.length);
                // Add new items
                this.data.unshift(...items.map((item, index) => new ((0, router_1.default)(item))(item, this.agent, [...this.propertyPath, (index).toString()])));
                return this.length;
            }
            shift() {
                if (this.length == 0)
                    return undefined;
                this.sendShiftOperation(1, -1);
                return this.data.shift();
            }
            splice(start, deleteCount, ...items) {
                if (!deleteCount)
                    return this.data.splice(start);
                return this.data.splice(start, deleteCount, ...items);
            }
            setSplice(start, deleteCount, ...items) {
                // If no delete count, delete all items from start to end
                if (deleteCount === undefined)
                    deleteCount = this.length - start;
                // Calculate how much to shift items
                const move = items.length - deleteCount;
                // If items on the right are getting shifted, send a shift operation
                if (start + deleteCount < this.length && move != 0) {
                    this.sendShiftOperation(start + deleteCount, move);
                }
                // Delete items not affected by replacement/shift
                if (move !== 0)
                    this.sendShiftOperation(-1, move);
                // Add new items
                const newItems = items.map((item, index) => new ((0, router_1.default)(item))(item, this.agent, [...this.propertyPath, (start + index).toString()]));
                this.data.splice(start, deleteCount, ...newItems);
                return newItems;
            }
            slice(start, end) {
                return this.data.slice(start, end);
            }
            setSlice(start, end) {
                if (start === undefined)
                    return this;
                if (start < -this.length)
                    start = 0;
                if (start < 0)
                    start += this.length;
                if (end === undefined || end >= this.length)
                    end = this.length;
                if (end < -this.length)
                    end = 0;
                if (end < 0)
                    end += this.length;
                // Let client know that all items from start to end are getting shifted left
                this.sendShiftOperation(start, -start);
                // Shift all items in MultyxList
                for (let i = start; i < end; i++) {
                    this.data[i - start] = this.data[i];
                }
                // Delete old items
                for (let i = this.length - 1; i >= end - start; i--) {
                    this.delete(i);
                }
                return this;
            }
            filter(predicate) {
                const keep = [];
                for (let i = 0; i < this.length; i++) {
                    keep.push(predicate(this.get(i), i, this));
                }
                return keep;
            }
            setFilter(predicate) {
                const keep = [];
                for (let i = 0; i < this.length; i++) {
                    keep.push(predicate(this.get(i), i, this));
                }
                let newLength = 0;
                let currentShiftLeft = 0;
                for (let i = this.length - 1; i >= 0; i--) {
                    if (!keep[i]) {
                        currentShiftLeft++;
                    }
                    else {
                        newLength++;
                        if (currentShiftLeft) {
                            this.sendShiftOperation(i, -currentShiftLeft);
                            currentShiftLeft = 0;
                        }
                    }
                }
                let offset = 0;
                for (let i = 0; i < this.length; i++) {
                    if (keep[i]) {
                        this.data[i - offset] = this.data[i];
                    }
                    else {
                        offset++;
                    }
                }
                this.length = newLength;
                return this;
            }
            map(callbackfn) {
                const next = [];
                for (let i = 0; i < this.length; i++) {
                    next.push(callbackfn(this.get(i), i, this));
                }
                return next;
            }
            setMap(callbackfn) {
                for (let i = 0; i < this.length; i++) {
                    this.set(i, callbackfn(this.get(i), i, this));
                }
                return this;
            }
            flat() {
                return this.data.flat();
            }
            setFlat() {
                for (let i = 0; i < this.length; i++) {
                    const item = this.get(i);
                    if (item instanceof MultyxList) {
                        for (let j = 0; j < item.length; j++) {
                            i++;
                            this.set(i, item[j]);
                        }
                    }
                }
            }
            reduce(callbackfn, startingAccumulator) {
                for (let i = 0; i < this.length; i++) {
                    startingAccumulator = callbackfn(startingAccumulator, this.get(i), i, this);
                }
                return startingAccumulator;
            }
            reduceRight(callbackfn, startingAccumulator) {
                for (let i = this.length - 1; i >= 0; i--) {
                    startingAccumulator = callbackfn(startingAccumulator, this.get(i), i, this);
                }
                return startingAccumulator;
            }
            reverse() {
                this.data.reverse();
                this.sendShiftOperation(-1, 0);
                return this;
            }
            forEach(callbackfn) {
                for (let i = 0; i < this.length; i++) {
                    callbackfn(this.get(i), i, this);
                }
            }
            every(predicate) {
                for (let i = 0; i < this.length; i++) {
                    if (!predicate(this.get(i), i, this))
                        return false;
                }
                return true;
            }
            some(predicate) {
                for (let i = 0; i < this.length; i++) {
                    if (predicate(this.get(i), i, this))
                        return true;
                }
                return false;
            }
            find(predicate) {
                for (let i = 0; i < this.length; i++) {
                    if (predicate(this.get(i), i, this))
                        return this.get(i);
                }
                return undefined;
            }
            findIndex(predicate) {
                for (let i = 0; i < this.length; i++) {
                    if (predicate(this.get(i), i, this))
                        return i;
                }
                return -1;
            }
            entries() {
                const entryList = [];
                for (let i = 0; i < this.length; i++) {
                    entryList.push([i, this.get(i)]);
                }
                return entryList;
            }
            keys() {
                return Array(this.length).fill(0).map((_, i) => i);
            }
            values() {
                return Array(this.length).fill(0).map((_, i) => this.get(i));
            }
            /* Native methods to allow MultyxList to be treated as primitive */
            [Symbol.iterator]() {
                const values = [];
                for (let i = 0; i < this.length; i++) {
                    const item = this.get(i);
                    if (item)
                        values[i] = item;
                }
                return values[Symbol.iterator]();
            }
        }
        _a = Symbol.toPrimitive;
        exports.default = MultyxList;
    });
    define("src/items/value", ["require", "exports", "src/utils/native"], function (require, exports, native_7) {
        "use strict";
        var _a;
        Object.defineProperty(exports, "__esModule", { value: true });
        class MultyxValue {
            get relayedValue() {
                if (!this.relayed)
                    return undefined;
                return this.value;
            }
            /**
             * Create a MultyxItem representation of a primitive
             * @param value Value to turn into MultyxItem
             * @param agent Client or MultyxTeam hosting this MultyxItem
             * @param propertyPath Entire path leading from agent to root
             */
            constructor(value, agent, propertyPath) {
                /**
                 * Set a minimum value for this property
                 * If requested value is lower, the accepted value will be the minimum value
                 * @param value Minimum value to allow
                 * @returns Same multyx object
                 */
                this.min = (value) => {
                    if (value instanceof MultyxValue)
                        value = value.value;
                    this.constraints.set('min', {
                        args: [value],
                        func: n => n >= value ? n : value
                    });
                    this[native_7.Get]('min', [value]);
                    return this;
                };
                /**
                 * Set a maximum value for this property
                 * If requested value is higher, the accepted value will be the maximum value
                 * @param value Maximum value to allow
                 * @returns Same multyx object
                 */
                this.max = (value) => {
                    if (value instanceof MultyxValue)
                        value = value.value;
                    this.constraints.set('max', {
                        args: [value],
                        func: n => n <= value ? n : value
                    });
                    this[native_7.Get]('max', [value]);
                    return this;
                };
                /**
                 * Only allow integer values for this property
                 * If float is passed, the accepted value will be the floored value
                 */
                this.int = () => {
                    this.constraints.set('int', {
                        args: [],
                        func: n => Math.floor(typeof n === 'number' ? n : Number(n))
                    });
                    this[native_7.Get]('int', []);
                    return this;
                };
                /**
                 * Disallow this property to have specified value
                 * Will revert to previous value if requested value is banned
                 * @param value Value to ban
                 * @returns Same Multyx object
                 */
                this.ban = (value) => {
                    var _b, _c;
                    if (value instanceof MultyxValue)
                        value = value.value;
                    const bans = (_c = (_b = this.constraints.get('ban')) === null || _b === void 0 ? void 0 : _b.args) !== null && _c !== void 0 ? _c : [];
                    bans.push(value);
                    this.constraints.set('ban', {
                        args: bans,
                        func: n => bans.includes(n) ? null : n
                    });
                    this[native_7.Get]('ban', bans);
                    return this;
                };
                /**
                 * Create custom constraint for value
                 * Only constrained server-side
                 * @param fn Function accepting requested value and returning either null or accepted value. If this function returns null, the value will not be accepted and the change reverted.
                 * @returns Same MultyxValue
                 */
                this.constrain = (fn) => {
                    this.manualConstraints.push(fn);
                    return this;
                };
                /* Native methods to allow MultyxValue to be treated as primitive */
                this.toString = () => String(this.value);
                this.valueOf = () => this.value;
                this[_a] = () => this.value;
                this.disabled = false;
                this.relayed = true;
                this.constraints = new Map();
                this.manualConstraints = [];
                this.bannedValues = new Set();
                this.publicAgents = new Set();
                this.propertyPath = propertyPath;
                this.agent = agent;
                this.publicAgents.add(this.agent);
                this.set(value);
            }
            // Only proper way to set value of MultyxValue to ensure client sync
            set(value) {
                var _b, _c;
                if (value instanceof MultyxValue)
                    value = value.value;
                // Check if value setting changes constraints
                for (const [_, { func }] of this.constraints.entries()) {
                    const constrained = func(value);
                    if (constrained === null)
                        return false;
                    value = constrained;
                }
                for (const constraint of this.manualConstraints) {
                    const constrained = constraint(value);
                    if (constrained === null)
                        return false;
                    value = constrained;
                }
                if (this.bannedValues.has(value))
                    return false;
                this.value = value;
                this[native_7.Send]();
                const propSymbol = Symbol.for("_" + this.propertyPath.join('.'));
                if ((_b = this.agent.server) === null || _b === void 0 ? void 0 : _b.events.has(propSymbol)) {
                    (_c = this.agent.server) === null || _c === void 0 ? void 0 : _c.events.get(propSymbol).forEach(event => {
                        event.call(undefined, this);
                        if (event.saveHistory)
                            event.delete(); // delete temp events
                    });
                }
                return true;
            }
            /**
             * Send an EditUpdate
             * @param agent Agent to send EditUpdate to, if undefined, send to all public agents
             */
            [native_7.Send](agent) {
                var _b;
                if (!this.relayed)
                    return;
                const clients = new Set();
                // Get all clients informed of this change
                if (agent) {
                    for (const c of agent.clients)
                        clients.add(c);
                }
                else {
                    for (const a of this.publicAgents) {
                        for (const c of a.clients)
                            clients.add(c);
                    }
                }
                // Tell server to relay update to all clients
                (_b = this.agent.server) === null || _b === void 0 ? void 0 : _b[native_7.Edit](this, clients);
            }
            /**
             * Send a ConstraintUpdate
             */
            [native_7.Get](name, args) {
                var _b;
                for (const client of this.agent.clients) {
                    (_b = this.agent.server) === null || _b === void 0 ? void 0 : _b[native_7.Self](client, 'constraint', { path: this.propertyPath, name, args });
                }
            }
            /**
             * Build a constraint table
             * @returns Constraint table
             */
            [native_7.Build]() {
                if (!this.relayed)
                    return {};
                const obj = {};
                for (const [cname, { args }] of this.constraints.entries())
                    obj[cname] = args;
                return obj;
            }
            /**
             * Edit the property path
             * @param newPath New property path to set value at
             */
            [native_7.Self](newPath, relay = true) {
                this.propertyPath = newPath;
                if (relay)
                    this[native_7.Send]();
            }
            /**
             * Disable setting value of MultyxValue
             * @returns Same MultyxValue
             */
            disable() {
                this.disabled = true;
                this.constraints.set('disabled', {
                    args: [true],
                    func: n => n,
                });
                this[native_7.Get]('disabled', [true]);
                return this;
            }
            /**
             * Enable setting value of MultyxValue
             * @returns Same MultyxValue
             */
            enable() {
                this.disabled = false;
                this.constraints.set('disabled', {
                    args: [false],
                    func: n => n,
                });
                this[native_7.Get]('disabled', [false]);
                return this;
            }
            relay() {
                if (this.relayed)
                    return this;
                this.relayed = true;
                // Relay all constraints on object
                for (const [cname, { args }] of this.constraints.entries()) {
                    this[native_7.Get](cname, args);
                }
                // Relay value of object
                this[native_7.Send]();
                return this;
            }
            unrelay() {
                var _b;
                if (!this.relayed)
                    return this;
                this.relayed = false;
                const clients = new Set();
                // Get all clients informed of this change
                for (const a of this.publicAgents) {
                    for (const c of a.clients)
                        clients.add(c);
                }
                (_b = this.agent.server) === null || _b === void 0 ? void 0 : _b[native_7.Remove](this, clients);
                return this;
            }
            /**
             * Publicize MultyxValue from specific MultyxTeam
             * @param team MultyxTeam to share MultyxValue to
             * @returns Same MultyxValue
             */
            addPublic(team) {
                if (this.publicAgents.has(team))
                    return this;
                this.publicAgents.add(team);
                team.addPublic(this);
                this[native_7.Send](team);
                return this;
            }
            /**
             * Privitize MultyxValue from specific MultyxTeam
             * @param team MultyxTeam to hide MultyxValue from
             * @returns Same MultyxValue
             */
            removePublic(team) {
                if (!this.publicAgents.has(team))
                    return this;
                this.publicAgents.delete(team);
                team.removePublic(this);
                // Send an EditUpdate clearing property from clients
                new MultyxValue(undefined, team, this.propertyPath);
                return this;
            }
            /**
             * Check if MultyxValue is visible to specific MultyxTeam
             * @param team MultyxTeam to check for visibility from
             * @returns Boolean, true if MultyxValue is visible to team, false otherwise
             */
            isPublic(team) {
                return this.publicAgents.has(team);
            }
        }
        _a = Symbol.toPrimitive;
        exports.default = MultyxValue;
    });
    define("src/items/object", ["require", "exports", "src/items/value", "src/items/router", "src/utils/native"], function (require, exports, value_1, router_2, native_8) {
        "use strict";
        var _a;
        Object.defineProperty(exports, "__esModule", { value: true });
        value_1 = __importDefault(value_1);
        router_2 = __importDefault(router_2);
        class MultyxObject {
            // spent 2 hours tryna make this [key: Exclude<string, keyof MultyxObject>]: MultyxItem<any>
            // fuck you ryan cavanaugh https://github.com/microsoft/TypeScript/issues/17867
            /**
             * Turn MultyxObject back into regular object
             * @returns RawObject mirroring shape and values of MultyxObject
             */
            get value() {
                const parsed = {};
                for (const p in this.data)
                    parsed[p] = this.data[p].value;
                return parsed;
            }
            /**
             * Get the value of MultyxObject that is relayed to public agents
             * @returns RawObject mirroring shape and values of relayed MultyxObject
             */
            get relayedValue() {
                if (!this.relayed)
                    return {};
                const parsed = {};
                for (const p in this.data) {
                    const m = this.data[p].relayedValue;
                    if (m !== undefined)
                        parsed[p] = m;
                }
                return parsed;
            }
            /**
             * Create a MultyxItem representation of an object
             * @param object Object to turn into MultyxItem
             * @param agent Client or MultyxTeam hosting this MultyxItem
             * @param propertyPath Entire path from agent to this MultyxObject
             * @returns MultyxObject
             */
            constructor(object, agent, propertyPath = [agent.uuid]) {
                /* Native methods to allow MultyxObject to be treated as primitive */
                this.toString = () => this.value.toString();
                this.valueOf = () => this.value;
                this[_a] = () => this.value;
                const data = {};
                this.propertyPath = propertyPath;
                this.agent = agent;
                this.disabled = false;
                this.relayed = true;
                this.publicTeams = new Set();
                if (object instanceof MultyxObject)
                    object = object.value;
                // Mirror object to be made of strictly MultyxItems
                for (const prop in object) {
                    let child = object[prop];
                    if (child instanceof MultyxObject || child instanceof value_1.default) {
                        child = child.value;
                    }
                    // MultyxItemRouter used to circumvent circular dependencies
                    // Check /items/router.ts for extra information
                    data[prop] = new ((0, router_2.default)(child))(child, agent, [...propertyPath, prop]);
                }
                this.data = data;
                // Apply proxy inside other constructor rather than here
                if (this.constructor !== MultyxObject)
                    return this;
                return new Proxy(this, {
                    has: (o, p) => {
                        return o.has(p);
                    },
                    // Allow users to access properties in MultyxObject without using get
                    get: (o, p) => {
                        if (p in o)
                            return o[p];
                        return o.data[p];
                    },
                    // Allow users to set MultyxObject properties by client.self.a = b
                    set: (o, p, v) => {
                        if (p in o) {
                            o[p] = v;
                            return true;
                        }
                        return !!o.set(p, v);
                    },
                    // Allow users to delete MultyxObject properties by delete client.self.a;
                    deleteProperty(o, p) {
                        return !!o.delete(p);
                    }
                });
            }
            disable() {
                for (const prop in this.data) {
                    this.data[prop].disable();
                }
                this.disabled = true;
                return this;
            }
            enable() {
                for (const prop in this.data) {
                    this.data[prop].enable();
                }
                this.disabled = false;
                return this;
            }
            relay() {
                for (const prop in this.data) {
                    this.data[prop].relay();
                }
                this.relayed = true;
                return this;
            }
            unrelay() {
                for (const prop in this.data) {
                    this.data[prop].unrelay();
                }
                this.relayed = false;
                return this;
            }
            /**
             * Publicize MultyxValue from specific MultyxTeam
             * @param team MultyxTeam to share MultyxValue to
             * @returns Same MultyxValue
             */
            addPublic(team) {
                if (this.publicTeams.has(team))
                    return this;
                this.publicTeams.add(team);
                for (const prop in this.data)
                    this.data[prop].addPublic(team);
                return this;
            }
            /**
             * Privitize MultyxValue from specific MultyxTeam
             * @param team MultyxTeam to hide MultyxValue from
             * @returns Same MultyxValue
             */
            removePublic(team) {
                if (!this.publicTeams.has(team))
                    return this;
                this.publicTeams.delete(team);
                for (const prop in this.data)
                    this.data[prop].removePublic(team);
                return this;
            }
            /**
             * Check if property is in object
             */
            has(property) {
                return property in this.data;
            }
            /**
             * Get the value of a property
             */
            get(property) {
                if (typeof property === 'string')
                    return this.data[property];
                if (property.length == 0)
                    return this;
                if (property.length == 1)
                    return this.data[property[0]];
                const next = this.data[property[0]];
                if (!next || (next instanceof value_1.default))
                    return undefined;
                return next.get(property.slice(1));
            }
            /**
             * Set the explicit value of the property
             * @example
             * ```js
             * // Server
             * multyx.on('reset', client => client.player.set('x', 5));
             *
             * // Client
             * client.player.x = 20 * Math.random();
             * multyx.send('reset');
             * console.log(client.player.x); // 5
             * ```
             */
            set(property, value) {
                var _b, _c;
                if (value instanceof native_8.EditWrapper && !this.has(property) && this.disabled) {
                    return false;
                }
                // If just a normal value change, no need to update shape, can return
                if (typeof value !== "object" && this.data[property] instanceof value_1.default
                    || value instanceof native_8.EditWrapper && typeof value.value !== 'object') {
                    return this.data[property].set(value instanceof native_8.EditWrapper ? value.value : value) ? this : false;
                }
                const propertyPath = [...this.propertyPath, property];
                // If value is a MultyxObject, don't create new object, change path
                if (value instanceof MultyxObject) {
                    value[native_8.Self](propertyPath);
                    this.data[property] = value;
                }
                else {
                    if (value instanceof value_1.default || value instanceof native_8.EditWrapper) {
                        value = value.value;
                    }
                    this.data[property] = new ((0, router_2.default)(value))(value, this.agent, propertyPath);
                }
                this.data[property].disabled = this.disabled;
                this.data[property].relayed = this.relayed;
                // Propogate publicAgents to clients
                for (const team of this.publicTeams) {
                    this.data[property].addPublic(team);
                }
                const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + property);
                if ((_b = this.agent.server) === null || _b === void 0 ? void 0 : _b.events.has(propSymbol)) {
                    (_c = this.agent.server) === null || _c === void 0 ? void 0 : _c.events.get(propSymbol).forEach(event => {
                        event.call(undefined, this.data[property]);
                        if (event.saveHistory)
                            event.delete(); // delete temp events
                    });
                }
                return this;
            }
            /**
             * Delete property from MultyxObject
             * @param property Name of property to delete
             * @returns False if deletion failed, same MultyxObject otherwise
             */
            delete(property) {
                delete this.data[property];
                new value_1.default(undefined, this.agent, [...this.propertyPath, property]);
                return this;
            }
            /**
             * Wait for a property in object to be defined
             * @param property Name of property in object to wait for
             * @returns Promise that resolves once object[property] is defined
             */
            await(property) {
                if (this.has(property))
                    return Promise.resolve(this.get(property));
                const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + property);
                return new Promise(res => {
                    var _b, _c;
                    const event = (_c = (_b = this.agent) === null || _b === void 0 ? void 0 : _b.server) === null || _c === void 0 ? void 0 : _c.on(propSymbol, (_, v) => res(v));
                    event.saveHistory = true; // so that caller knows to delete
                });
            }
            /**
             * Create a callback that gets called whenever the object is edited
             * @param property Property to listen for writes on
             * @param callback Function to call whenever object is edited
             * @returns Event object representing write callback
             */
            onWrite(property, callback) {
                const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + "." + property);
                return this.agent.server.on(propSymbol, (_, v) => callback(v));
            }
            /**
             * Get all properties in object publicized to specific team
             * @param team MultyxTeam to get public data for
             * @returns Raw object
             */
            [native_8.Get](team) {
                const parsed = {};
                for (const prop in this.data) {
                    const m = this.data[prop];
                    if (m instanceof value_1.default) {
                        if (m.isPublic(team))
                            parsed[prop] = m.value;
                    }
                    else {
                        if (native_8.Get in m) {
                            parsed[prop] = m[native_8.Get](team);
                        }
                    }
                }
                return parsed;
            }
            /**
             * Build a constraint table
             * @returns Constraint table
             */
            [native_8.Build]() {
                if (!this.relayed)
                    return {};
                const obj = {};
                for (const prop in this.data) {
                    if (native_8.Build in this.data[prop]) {
                        const table = this.data[prop][native_8.Build]();
                        if (Object.keys(table).length == 0)
                            continue;
                        obj[prop] = table;
                    }
                }
                return obj;
            }
            /**
             * Edit the property path of MultyxObject and any children
             * @param newPath New property path to take
             */
            [native_8.Self](newPath) {
                this.propertyPath = newPath;
                for (const prop in this.data) {
                    if (native_8.Self in this.data[prop]) {
                        this.data[prop][native_8.Self]([...newPath, prop]);
                    }
                }
            }
            entries() {
                return Object.entries(this.data);
            }
            keys() {
                return Object.keys(this.data);
            }
            values() {
                return Object.values(this.data);
            }
        }
        _a = Symbol.toPrimitive;
        exports.default = MultyxObject;
    });
    define("src/items/index", ["require", "exports", "src/items/list", "src/items/object", "src/items/value"], function (require, exports, list_1, object_1, value_2) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.MultyxValue = exports.MultyxObject = exports.MultyxList = void 0;
        exports.IsMultyxItem = IsMultyxItem;
        list_1 = __importDefault(list_1);
        object_1 = __importDefault(object_1);
        value_2 = __importDefault(value_2);
        exports.MultyxList = list_1.default;
        exports.MultyxObject = object_1.default;
        exports.MultyxValue = value_2.default;
        function IsMultyxItem(data) {
            if (data instanceof list_1.default)
                return true;
            if (data instanceof object_1.default)
                return true;
            if (data instanceof value_2.default)
                return true;
            //if(data instanceof MultyxUndefined) return true;
            return false;
        }
        Array().reverse;
    });
    
    'marker:resolver';

    function get_define(name) {
        if (defines[name]) {
            return defines[name];
        }
        else if (defines[name + '/index']) {
            return defines[name + '/index'];
        }
        else {
            const dependencies = ['exports'];
            const factory = (exports) => {
                try {
                    Object.defineProperty(exports, "__cjsModule", { value: true });
                    Object.defineProperty(exports, "default", { value: require(name) });
                }
                catch (_a) {
                    throw Error(['module "', name, '" not found.'].join(''));
                }
            };
            return { dependencies, factory };
        }
    }
    const instances = {};
    function resolve(name) {
        if (instances[name]) {
            return instances[name];
        }
        if (name === 'exports') {
            return {};
        }
        const define = get_define(name);
        if (typeof define.factory !== 'function') {
            return define.factory;
        }
        instances[name] = {};
        const dependencies = define.dependencies.map(name => resolve(name));
        define.factory(...dependencies);
        const exports = dependencies[define.dependencies.indexOf('exports')];
        instances[name] = (exports['__cjsModule']) ? exports.default : exports;
        return instances[name];
    }
    if (entry[0] !== null) {
        return resolve(entry[0]);
    }
})();