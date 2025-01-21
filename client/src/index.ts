import { Message } from "./message";
import { BuildConstraint, EditWrapper, Interpolate, isProxy, Lerp, PredictiveLerp } from './utils';
import { Constraint, RawObject, Value } from "./types";
import { Controller } from "./controller";
class Multyx {
    ws: WebSocket;
    uuid: string;
    joinTime: number;
    ping: number;
    events: Map<string | Symbol, ((data?: any) => void)[]>;
    self: RawObject;
    all: RawObject;
    clients: RawObject;
    teams: RawObject;
    constraintTable: RawObject<RawObject | Constraint>;
    controller: Controller;

    Start = Symbol('start');
    Connection = Symbol('connection');
    Disconnect = Symbol('disconnect');
    Edit = Symbol('edit');
    Public = Symbol('public');
    Native = Symbol('native');
    Custom = Symbol('custom');
    Any = Symbol('any');

    Lerp = Lerp;
    Interpolate = Interpolate;
    PredictiveLerp = PredictiveLerp;

    private ProxySet: Set<RawObject> = new Set();

    constructor() {
        this.ws = new WebSocket('ws://localhost:8080/');
        this.ping = 0;
        this.events = new Map();
        this.self = {};
        this.all = {};
        this.constraintTable = {};
        this.controller = new Controller(this.ws);

        this.ws.onmessage = event => {
            const msg = Message.Parse(event.data);
            this.ping = 2 * (Date.now() - msg.time);

            if(msg.native) {
                this.parseNativeEvent(msg);
                this.events.get(this.Native)?.forEach(cb => cb());
            } else if(msg.name in this.events) {
                this.events[msg.name](msg.data);
                this.events.get(this.Custom)?.forEach(cb => cb());
            }
            this.events.get(this.Any)?.forEach(cb => cb());
        }
    }

    on(name: string | Symbol, callback: (data: RawObject) => void) {
        const events = this.events.get(name) ?? [];
        events.push(callback);
        this.events.set(name, events);
    }

    send(name: string, data: any, expectResponse: boolean = false) {
        if(name[0] === '_') name = '_' + name;
        this.ws.send(Message.Create(name, data));
        if(!expectResponse) return;

        return new Promise(res => this.events.set(Symbol.for("_" + name), [res]));
    }

    loop(timesPerSecond: number, callback: () => void) {
        this.on(this.Start, () => setInterval(callback, Math.round(1000/timesPerSecond)));
    }

    forAll(callback: (client: RawObject) => void) {
        // If server connected, apply callback to all clients
        if(this.ws.readyState == 1) Object.values(this.clients).forEach(c => callback(c));
        
        // Wait for server to connect and Multyx to initialize
        else new Promise(res => this.on(this.Start, res)).then(() => {
            Object.values(this.clients).forEach(c => callback(c));
        });

        // Any future connections will have callback called
        this.on(this.Connection, callback);
    }

    private parseNativeEvent(msg: Message) {
        console.log(msg);
        for(const update of msg.data) {
            switch(update.instruction) {
                // Initialization
                case 'init': {
                    this.initialize(update);
                    break;
                }

                // Client or team data edit
                case 'edit': {
                    this.parseEdit(update);
                    break;
                }

                // Self meta-data change
                case 'self': {
                    if(update.prop == 'controller') {
                        this.controller.listening = new Set(update.data);
                    } else if(update.prop == 'uuid') {
                        this.uuid = update.data;
                    }
                    break;
                }

                // Connection
                case 'conn': {
                    this.clients[update.uuid] = update.data;
                    this.events.get(this.Connection)?.forEach(c => c(update));
                    break;
                }

                // Disconnection
                case 'dcon': {
                    delete this.clients[update.uuid];
                    this.events.get(this.Disconnect)?.forEach(c => c(update));
                    break;
                }

                // Response to client
                case 'resp': {
                    const promiseResolve = this.events.get(Symbol.for("_" + update.name))[0];
                    promiseResolve(update.response);
                    break;
                }

                default: {
                    console.error("Unknown native Multyx instruction");
                }
            }
        }
    }

    private initialize(update: RawObject) {
        this.uuid = update.client.uuid;
        this.joinTime = update.client.joinTime;
        this.self = update.client.self;

        this.unpackConstraints(update.constraintTable);
        this.controller.listening = new Set(update.client.controller);

        this.clients = update.clients;
        this.teams = update.teams;
        this.all = update.teams.all;

        this.self = this.applyProxy(this.self, [this.uuid]);
        for(const team of Object.keys(this.teams)) {
            this.teams[team] = this.applyProxy(this.teams[team], [team]);
        }
        
        this.all = this.teams['all'];
        this.clients[this.uuid] = this.self;

        this.events.get(this.Start)?.forEach(c => c(update));
    }

    private parseEdit(update: RawObject) {
        let route: any = update.team ? this.teams : this.clients;
        let proxyObject = update.team && !(update.path[0] in this.teams);
    
        for(const p of update.path.slice(0, -1)) {
            if(!(p in route)) route[p] = {};
            route = route[p];
        }
        const prop = update.path.slice(-1)[0];

        // Check if editable is proxied
        route[prop] = route[isProxy]
            ? new EditWrapper(update.value)
            : update.value;

        // Client joined a new team
        if(proxyObject) {
            this.teams[update.path[0]] = this.applyProxy(
                this.teams[update.path[0]],
                [update.path[0]]
            );
        }
        
        this.events.get(this.Edit)?.forEach(c => c(update));
    }

    private unpackConstraints(packedConstraints) {
        function recurse(pair: RawObject, packed: RawObject, unpackTo: RawObject) {
            for(const [prop, node] of Object.entries(packed)) {
                if(typeof pair[prop] == 'object') {
                    recurse(pair[prop], node, unpackTo[prop] = {});
                    continue;
                }
                
                const constraints = unpackTo[prop] = {};
                for(const [cname, args] of Object.entries(node)) {
                    constraints[cname] = BuildConstraint(cname, args as Value[]);
                }
            }

        }

        recurse(this.self, packedConstraints, this.constraintTable);
    }

    private applyProxy(object: RawObject, path: string[]) {
        let constraintList = this.constraintTable;
        for(const prop of path) {
            if(!(prop in constraintList)) break;
            constraintList = constraintList[prop] as RawObject;
        }

        const proxyGetter = (_, prop) => {
            // Proxy checker
            if(prop === isProxy) return true;

            // Nest proxy if getting object for first time
            if(typeof object[prop] == 'object' && !this.ProxySet.has(object[prop])) {
                object[prop] = this.applyProxy(object[prop], [...path, prop]);
                this.ProxySet.add(object[prop]);
            }

            // Now getting a value or an already proxied object
            return object[prop];
        };

        const proxySetter = (_, prop, value) => {
            if(value === object[prop]) return true;

            // So that native operations can edit without sending redundant requests
            if(value instanceof EditWrapper) {
                if(value.data === undefined) return delete object[prop];
                object[prop] = value.data;
                return true;
            }

            // Operations not editing values of list can stay
            if(Array.isArray(object) && Number.isNaN(parseInt(prop))) {
                object[prop] = value;
                return true;
            }

            // Constrain value according to constraint list
            let nv = value;
            if(value === undefined) {
                delete object[prop];
            } else {
                if(prop in constraintList) {
                    for(const func of Object.values(constraintList[prop])) nv = func(nv);
                }
                
                // Set value and send multyx request
                if(object[prop] === nv) return true;
                object[prop] = nv;
                if(nv === undefined) delete object[prop];
            }

            this.ws.send(Message.Native({
                instruction: 'edit',
                path: [...path, prop],
                value: nv
            }));
            return true;
        }

        const proxyDeleter = (_, prop: string) => {
            delete object[prop];
            this.ws.send(Message.Native({
                instruction: 'edit',
                path: [...path, prop],
                value: undefined
            }));
            return true;
        }

        return new Proxy(object, {
            get: proxyGetter,
            set: proxySetter,
            deleteProperty: proxyDeleter,
        });
    }
}

export default new Multyx();