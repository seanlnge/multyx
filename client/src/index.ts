import { Message } from "./message";
import { BuildConstraint, EditWrapper, isProxy } from "./utils";
import { Constraint, RawObject, Value } from "./types";
import { Controller } from "./controller";

export default class Multyx {
    ws: WebSocket;
    uuid: number;
    joinTime: number;
    ping: number;
    events: Map<string, ((data?: any) => void)[]>;
    shared: RawObject;
    clients: RawObject;
    constraintTable: RawObject<RawObject | Constraint>;
    controller: Controller;

    constructor() {
        this.ws = new WebSocket('ws://localhost:8080/');
        this.ping = 0;
        this.events = new Map();
        this.shared = {};
        this.constraintTable = {};
        this.controller = new Controller(this.ws);

        this.ws.onmessage = event => {
            const msg = Message.Parse(event.data);
            this.ping = 2 * (Date.now() - msg.time);

            if(msg.native) {
                console.log(msg);
                return this.parseNativeEvent(msg);
            }

            if(msg.name in this.events) {
                this.events[msg.name](msg.data);
            }
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

    private parseNativeEvent(msg: Message) {
        for(const update of msg.data) {
            if(update.instruction == 'init') {
                this.uuid = update.client.uuid;
                this.joinTime = update.client.joinTime;
                this.shared = update.client.shared;

                this.unpackConstraints(update.constraintTable);
                this.controller.addUnpacked(update.client.controller);
    
                this.clients = update.clients;
                this.setupClientProxy();
    
                (this.events.get(Multyx.Start) ?? []).forEach(c => c());
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
                
                (this.events.get(Multyx.Connection) ?? []).forEach(c => c(update.data));
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

        recurse(this.shared, packedConstraints, this.constraintTable);
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

                    if(!(prop in object) || typeof value == 'object') {
                        throw new Error(`Cannot alter shape of shared client object. Attempting to set ${path.join('.') + "." + prop} to ${value}`);
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
                deleteProperty() {
                    throw new Error('Cannot alter shape of shared client object');
                }
            });
        }

        this.shared = recurse(this.shared);
        this.clients[this.uuid] = this.shared;
    }

    static Start = 'start';
    static Connection = 'connection';

    static Lerp(object: RawObject, property: string) {
        let start = { value: object[property], time: Date.now() };
        let end = { value: object[property], time: Date.now() };
        
        Object.defineProperty(object, property, {
            get: () => {
                let ratio = Math.min(1, (Date.now() - end.time) / (end.time - start.time));
                if(Number.isNaN(ratio)) ratio = 0;
                
                return end.value * ratio + start.value * (1 - ratio);
            },
            set: (value) => {
                // Don't lerp between edit requests sent in same frame
                if(Date.now() - end.time < 10) {
                    end.value = value;
                    return true;
                }
                start = { ...end };
                end = { value, time: Date.now() }
                return true;
            }
        });
    }
}