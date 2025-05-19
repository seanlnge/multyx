import { Message, UncompressUpdate } from "./message";
import { Unpack, EditWrapper, Add, Edit, Done } from './utils';
import { RawObject } from "./types";
import { Controller } from "./controller";
import { MultyxClientObject, MultyxClientValue } from "./items";
import { DefaultOptions, Options } from "./options";
export default class Multyx {
    ws: WebSocket;
    uuid: string;
    joinTime: number;
    ping: number;
    events: Map<string | Symbol, ((data?: any) => void)[]>;
    self: RawObject;
    all: RawObject;
    clients: { [key: string]: MultyxClientObject };
    teams: MultyxClientObject;
    controller: Controller;

    options: Options;
    
    // Queue of functions to be called after each frame
    [Done]: ((...args: any[]) => void)[] = [];

    static Start = Symbol('start');
    static Connection = Symbol('connection');
    static Disconnect = Symbol('disconnect');
    static Edit = Symbol('edit');
    static Native = Symbol('native');
    static Custom = Symbol('custom');
    static Any = Symbol('any');

    constructor(options: Options = {}, callback?: () => void) {
        this.options = { ...DefaultOptions, ...options };

        const url = `ws${this.options.secure ? 's' : ''}://${this.options.uri.split('/')[0]}:${this.options.port}/${this.options.uri.split('/')[1] ?? ''}`;
        this.ws = new WebSocket(url);
        this.ping = 0;
        this.events = new Map();
        this.self = {};
        this.all = {};
        this.teams = new MultyxClientObject(this, {}, [], true);
        this.clients = {};
        this.controller = new Controller(this.ws);

        callback?.();

        this.ws.onmessage = event => {
            const msg = Message.Parse(event.data);
            this.ping = 2 * (Date.now() - msg.time);

            if(msg.native) {
                this.parseNativeEvent(msg);
                this.events.get(Multyx.Native)?.forEach(cb => cb(msg));
            } else {
                this.events.get(Multyx.Custom)?.forEach(cb => cb(msg));
            }
            this.events.get(Multyx.Any)?.forEach(cb => cb(msg));
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

    /**
     * Loop over a function
     * @param callback Function to call on a loop
     * @param timesPerSecond Recommended to leave blank. Number of times to loop in each second, if undefined, use requestAnimationFrame
     */
    loop(callback: () => void, timesPerSecond?: number) {
        if(timesPerSecond) {
            this.on(Multyx.Start, () => setInterval(callback, Math.round(1000/timesPerSecond)));
        } else {
            const caller = () => {
                callback();
                requestAnimationFrame(caller);
            }
            this.on(Multyx.Start, () => requestAnimationFrame(caller));
        }
    }

    [Add](callback: () => void) {
        this[Done].push(callback);
    }

    private parseNativeEvent(msg: Message) {
        msg.data = msg.data.map(UncompressUpdate);
        if(this.options.logUpdateFrame) console.log(msg.data);

        for(const update of msg.data) {
            switch(update.instruction) {
                // Initialization
                case 'init': {
                    this.initialize(update);

                    for(const listener of this.events.get(Multyx.Start) ?? []) {
                        this[Done].push(() => listener(update));
                    }
                    
                    // Clear start event as it will never be called again
                    if(this.events.has(Multyx.Start)) this.events.get(Multyx.Start).length = 0;
                    break;
                }

                // Client or team data edit
                case 'edit': {
                    if(update.path.length == 1) {
                        if(update.team) {
                            this.teams.set(update.path[0], new EditWrapper(update.value));
                        } else {
                            this.clients[update.path[0]] = new MultyxClientObject(
                                this,
                                new EditWrapper(update.value),
                                [update.path[0]],
                                false
                            );
                        }
                    }

                    const agent = update.team
                        ? this.teams.get(update.path[0]) as MultyxClientObject
                        : this.clients[update.path[0]];
                    if(!agent) return;
                    
                    const path = update.path.slice(1, -1);
                    const prop = update.path.slice(-1)[0];

                    agent.get(path)?.set(prop, new EditWrapper(update.value));

                    for(const listener of this.events.get(Multyx.Edit) ?? []) {
                        this[Done].push(() => listener(update));
                    }
                    break;
                }

                // Other data change
                case 'self': {
                    this.parseSelf(update);
                    break;
                }

                // Connection
                case 'conn': {
                    this.clients[update.uuid] = new MultyxClientObject(
                        this,
                        update.data,
                        [update.uuid],
                        false
                    );

                    for(const listener of this.events.get(Multyx.Connection) ?? []) {
                        this[Done].push(() => listener(this.clients[update.uuid]));
                    }
                    break;
                }

                // Disconnection
                case 'dcon': {
                    for(const listener of this.events.get(Multyx.Disconnect) ?? []) {
                        const clientValue = this.clients[update.client].value;
                        this[Done].push(() => listener(clientValue));
                    }
                    delete this.clients[update.client];
                    break;
                }

                // Response to client
                case 'resp': {
                    const promiseResolve = this.events.get(Symbol.for("_" + update.name))[0];
                    promiseResolve(update.response);
                    break;
                }

                default: {
                    if(this.options.verbose) {
                        console.error("Server error: Unknown native Multyx instruction");
                    }
                }
            }
        }

        this[Done].forEach(x => x());
        this[Done].length = 0;
    }

    private initialize(update: RawObject) {
        this.uuid = update.client.uuid;
        this.joinTime = update.client.joinTime;
        this.controller.listening = new Set(update.client.controller);

        // Create MultyxClientObject for all teams
        for(const team of Object.keys(update.teams)) {
            this.teams[team] = new EditWrapper(update.teams[team]);
        }
        this.all = this.teams['all'];

        // Create MultyxClientObject for all clients
        this.clients = {};
        for(const [uuid, client] of Object.entries(update.clients)) {
            if(uuid == this.uuid) continue;
            this.clients[uuid] = new MultyxClientObject(
                this,
                new EditWrapper(client),
                [uuid],
                false
            );
        };

        const client = new MultyxClientObject(
            this, 
            new EditWrapper(update.client.self), 
            [this.uuid], 
            true
        );
        this.self = client;
        this.clients[this.uuid] = client;

        // Apply all constraints on self and teams
        for(const [uuid, table] of Object.entries(update.constraintTable)) {
            const obj = this.uuid == uuid ? this.self : this.teams[uuid];
            obj[Unpack](table);
        }
    }

    private parseSelf(update: RawObject) {
        if(update.property == 'controller') {
            this.controller.listening = new Set(update.data);
        } else if(update.property == 'uuid') {
            this.uuid = update.data;
        } else if(update.property == 'constraint') {
            let route = this.uuid == update.data.path[0] ? this.self : this.teams[update.data.path[0]];
            for(const prop of update.data.path.slice(1)) route = route?.[prop];
            if(route === undefined) return;

            route[Unpack]({ [update.data.name]: update.data.args });
        }
    }
}