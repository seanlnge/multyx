Multyx = (() => {

class Message {
    constructor(name, data) {
        this.name = name;
        this.data = data;
        this.time = Date.now();
    }

    static BundleOperations(deltaTime, operations) {
        if(!Array.isArray(operations)) operations = [operations];
        return JSON.stringify(new Message('_', { operations, deltaTime }));
    }

    static Parse(str) {
        const parsed = JSON.parse(str);
        return new Message(parsed.name, parsed.data);
    }

    static Create(name, data) {
        if(typeof data === 'function') {
            throw new Error('Multyx data must be JSON storable');
        }
        return JSON.stringify(new Message(name, data));
    }
}

function unpackConstraints(pair, packed, unpacked) {
    for(const [prop, node] of Object.entries(packed)) {
        if(typeof pair[prop] == 'object') {
            unpackConstraints(pair[prop], node, unpacked[prop] = {});
            continue;
        }
        
        const constraints = unpacked[prop] = {};
        for(const [cname, args] of Object.entries(node)) {
            switch(cname) {
                // args[0] is min/max, args[1] is harsh boolean
                case 'min': {
                    constraints[cname] = n => n >= args[0] ? n : args[1] ? null : args[0];
                    continue;
                }
                case 'max': {
                    constraints[cname] = n => n <= args[0] ? n : args[1] ? null : args[0];
                    continue;
                }
            }
        }
    }
}

const constraintTable = {};
const isProxy = Symbol("isProxy");

class EditWrapper {
    constructor(data) {
        this.data = data;
    }
}

function parseNativeEvent(msg, multyx) {
    for(const update of msg.data) {
        if(update.instruction == 'init') {
            multyx.uuid = update.client.uuid;
            multyx.joinTime = update.client.joinTime;
            multyx.client = update.client.shared;
            unpackConstraints(update.client.shared, update.constraintTable, constraintTable);

            multyx.clients = update.clients;
            multyx.server = update.server;
            setupClientProxy(multyx);

            multyx.events[Multyx.Start]?.();
        }
        
        else if(update.instruction == 'edit') {
            let toedit = multyx.clients;
            
            update.path.unshift(update.uuid);
            for(const p of update.path.slice(0, -1)) toedit = toedit[p];
            const prop = update.path.slice(-1)[0];

            // Check if editable is proxied
            toedit[prop] = toedit[prop][isProxy] ? new EditWrapper(update.value) : update.value;
            
        }

        else if(update.instruction == 'conn') {
            multyx.clients[update.uuid] = update.data;
            multyx.events[Multyx.Connection]?.(update.data);
        }
    }
}

/**
 * Proxy the client object to listen for any changes
 * If there are valid changes, send to server
 * 
 * @param {Multyx} multyx 
 */
function setupClientProxy(multyx) {
    const proxySet = new WeakSet();

    const recurse = (object, path=[]) => {
        let constraintList = constraintTable;
        for(const prop of path) {
            if(!(prop in constraintList)) break;
            constraintList = constraintList[prop];
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
            set(_, prop, value) {
                // So that native operations can edit without sending redundant requests
                if(value instanceof EditWrapper) {
                    return object[prop] = value.data;
                }

                if(!(prop in object) || typeof value == 'object') {
                    throw new Error(`Cannot alter shape of shared client object. Attempting to set ${path.join('.') + "." + prop} to ${value}`);
                }

                // Constrain value according to constraint list
                let nv = value;
                if(prop in constraintList) {
                    for(const func of Object.values(constraintList[prop])) {
                        nv = func(nv);
                        if(nv === null) return false;
                    }
                }
                
                // Set value and send multyx request
                if(object[prop] === nv) return;
                object[prop] = nv;

                multyx.ws.send(Message.Create('_', {
                    instruction: 'edit',
                    path,
                    prop,
                    value: nv
                }));
            },
            deleteProperty() {
                throw new Error('Cannot alter shape of shared client object');
            }
        });
    }

    multyx.client = recurse(multyx.client);
    multyx.clients[multyx.uuid] = multyx.client;
}

return class Multyx {
    constructor() {
        this.ws = new WebSocket('ws://localhost:8080/');
        this.events = {};
        this.ping = undefined;

        this.client = {};
        this.clients = {};
        this.server = {};

        this.ws.onmessage = event => {
            const msg = Message.Parse(event.data);
            this.ping = Date.now() - msg.time;

            if(msg.name == '_') {
                return parseNativeEvent(msg, this);
            }
            
            if(msg.name in this.events){
                this.events[msg.name](msg.data, msg.deltaTime);
            }
        };
    }

    on(name, callback) {
        this.events[name] = callback;
    }


    send(name, data) {
        if(name === '_') throw new Error('Name "_" is reserved for native Multyx operations');
        this.ws.send(Message.Create(name, data));
    }

    static Lerp(object, property) {
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
                    return;
                }
                start = { ...end };
                end = { value, time: Date.now() }
            }
        });
    }

    static Start = "start";
    static Connection = "connection";
}})();