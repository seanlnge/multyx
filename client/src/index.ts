import { Message } from "./message";
import { BuildConstraint, EditWrapper, Interpolate, isProxy, Lerp } from './utils';
import { Constraint, RawObject, Value } from "./types";
import { Controller } from "./controller";
class Multyx {
    ws: WebSocket;
    uuid: number;
    joinTime: number;
    ping: number;
    events: Map<string, ((data?: any) => void)[]>;
    self: RawObject;
    clients: RawObject;
    constraintTable: RawObject<RawObject | Constraint>;
    controller: Controller;

    Start = '_start';
    Connection = '_connection';
    Update = '_update';
    Any = '_any';
    Lerp = Lerp;
    Interpolate = Interpolate;

    constructor() {
        this.ws = new WebSocket('ws://localhost:8080/');
        this.ping = 0;
        this.events = new Map();
        this.self = {};
        this.constraintTable = {};
        this.controller = new Controller(this.ws);

        this.ws.onmessage = event => {
            const msg = Message.Parse(event.data);
            this.ping = 2 * (Date.now() - msg.time);

            if(msg.native) {
                this.parseNativeEvent(msg);
                this.events.get(this.Update)?.forEach(cb => cb());
            } else if(msg.name in this.events) {
                this.events[msg.name](msg.data);
            }
            this.events.get(this.Any)?.forEach(cb => cb());
        }
    }

    on(name: string, callback: (data: RawObject) => void) {
        const events = this.events.get(name) ?? [];
        events.push(callback);
        this.events.set(name, events);
    }

    send(name: string, data: RawObject) {
        if(name[0] === '_') name = '_' + name;
        this.ws.send(Message.Create(name, data));
    }

    forAll(callback: (client: RawObject) => void) {
        // If server connected, apply callback to all clients
        if(this.ws.readyState == 1) Object.values(this.clients).forEach(c => callback(c));
        
        // Wait for server to connect and Multyx to initialize
        else new Promise(res => this.on(this.Start, res)).then(() => {
            console.log(this.ws.readyState, this.clients);
            Object.values(this.clients).forEach(c => callback(c));
        });

        // Any future connections will have callback called
        this.on(this.Connection, callback);
    }

    private parseNativeEvent(msg: Message) {
        for(const update of msg.data) {
            if(update.instruction == 'init') {
                this.uuid = update.client.uuid;
                this.joinTime = update.client.joinTime;
                this.self = update.client.self;

                this.unpackConstraints(update.constraintTable);
                this.controller.addUnpacked(update.client.controller);
    
                this.clients = update.clients;
                this.setupClientProxy();

                (this.events.get(this.Start) ?? []).forEach(c => c());
            }
            
            else if(update.instruction == 'edit') {
                let toedit: any = this.clients;
                
                update.path.unshift(update.uuid);
                for(const p of update.path.slice(0, -1)) toedit = toedit[p];
                const prop = update.path.slice(-1)[0];
    
                // Check if editable is proxied
                toedit[prop] = toedit[isProxy] ? new EditWrapper(update.value) : update.value;
            }
    
            else if(update.instruction == 'conn') {
                this.clients[update.uuid] = update.data;
                
                (this.events.get(this.Connection) ?? []).forEach(c => c(update.data));
            }
        }
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

    private setupClientProxy() {
        const proxySet = new WeakSet();
        const multyx = this;

        function recurse(object, path=[]) {
            let constraintList = multyx.constraintTable;
            for(const prop of path) {
                if(!(prop in constraintList)) break;
                constraintList = constraintList[prop] as RawObject;
            }

            return new Proxy(object, {
                get(_, prop) {
                    // Proxy checker
                    if(prop === isProxy) return true;

                    // Nest proxy if getting object for first time
                    if(typeof object[prop] == 'object' && !proxySet.has(object[prop])) {
                        object[prop] = recurse(object[prop], [...path, prop]);
                        proxySet.add(object[prop]);
                    }

                    // Now getting a value or an already proxied object
                    return object[prop];
                },
                
                set(_, prop: string, value) {
                    if(value === object[prop]) return true;

                    // So that native operations can edit without sending redundant requests
                    if(value instanceof EditWrapper) {
                        object[prop] = value.data;
                        return true;
                    }

                    if(!Array.isArray(object) && (!(prop in object) || typeof value == 'object')) {
                        throw new Error(`Cannot alter shape of Multyx object shared with server. Attempting to set ${path.join('.') + "." + prop} to ${value}`);
                    }

                    // Constrain value according to constraint list
                    let nv = value;
                    if(prop in constraintList) {
                        for(const func of Object.values(constraintList[prop])) nv = func(nv);
                    }
                    
                    // Set value and send multyx request
                    if(object[prop] === nv) return true;
                    object[prop] = nv;

                    multyx.ws.send(Message.Native({
                        instruction: 'edit',
                        path: [...path, prop],
                        value: nv
                    }));
                    return true;
                },
                deleteProperty(_, prop: string) {
                    if(!Array.isArray(object)) {
                        throw new Error('Cannot alter shape of Multyx object shared with server');
                    }

                    multyx.ws.send(Message.Native({
                        instruction: 'edit',
                        path: [...path, prop],
                        value: undefined
                    }));
                    return true;
                }
            });
        }

        this.self = recurse(this.self);
        this.clients[this.uuid] = this.self;
    }
}

export default new Multyx();