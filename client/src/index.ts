import { Message } from "./message";
import { Unpack, EditWrapper, Add } from './utils';
import { RawObject } from "./types";
import { Controller } from "./controller";
import { MultyxClientObject } from "./items";
import { DefaultOptions, Options } from "./options";

export default class Multyx {
    ws: WebSocket;
    uuid: string;
    joinTime: number;
    ping: number;
    events: Map<string | Symbol, ((data?: any) => void)[]>;
    self: RawObject;
    all: RawObject;
    clients: RawObject;
    teams: RawObject;
    controller: Controller;

    options: Options;
    
    // Queue of functions to be called after each frame
    private listenerQueue: ((...args: any[]) => void)[];

    static Start = Symbol('start');
    static Connection = Symbol('connection');
    static Disconnect = Symbol('disconnect');
    static Edit = Symbol('edit');
    static Native = Symbol('native');
    static Custom = Symbol('custom');
    static Any = Symbol('any');

    constructor(options: Options = {}, callback?: () => void) {
        this.options = { ...DefaultOptions, ...options };

        const url = `ws${this.options.secure ? 's' : ''}://${this.options.uri}:${this.options.port}/`;
        this.ws = new WebSocket(url);
        this.ping = 0;
        this.events = new Map();
        this.self = {};
        this.all = {};
        this.teams = {};
        this.clients = {};
        this.controller = new Controller(this.ws);
        this.listenerQueue = [];

        callback?.();

        this.ws.onmessage = event => {
            const msg = Message.Parse(event.data);
            this.ping = 2 * (Date.now() - msg.time);

            if(msg.native) {
                this.parseNativeEvent(msg);
                this.events.get(Multyx.Native)?.forEach(cb => cb(msg));
            } else if(msg.name in this.events) {
                this.events[msg.name](msg.data);
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

    
    /**
     * Create a callback function that gets called for any current or future client
     * @param callbackfn Function to call for every client
     */
    forAll(callback: (client: MultyxClientObject) => void) {
        this.teams.all.clients.forAll((uuid) => callback(this.clients[uuid]));
        this.on(Multyx.Connection, callback);
    }

    private parseNativeEvent(msg: Message) {
        if(this.options.logUpdateFrame) console.log(msg);

        for(const update of msg.data) {
            switch(update.instruction) {
                // Initialization
                case 'init': {
                    this.initialize(update);

                    for(const listener of this.events.get(Multyx.Start) ?? []) {
                        this.listenerQueue.push(() => listener(update));
                    }
                    
                    // Clear start event as it will never be called again
                    this.events.get(Multyx.Start).length = 0;
                    break;
                }

                // Client or team data edit
                case 'edit': {
                    this.parseEdit(update);

                    for(const listener of this.events.get(Multyx.Edit) ?? []) {
                        this.listenerQueue.push(() => listener(update));
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
                        this.listenerQueue.push(() => listener(this.clients[update.uuid]));
                    }
                    break;
                }

                // Disconnection
                case 'dcon': {
                    for(const listener of this.events.get(Multyx.Disconnect) ?? []) {
                        const clientValue = this.clients[update.client].value;
                        this.listenerQueue.push(() => listener(clientValue));
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

        this.listenerQueue.forEach(x => x());
        this.listenerQueue.length = 0;
    }

    private initialize(update: RawObject) {
        this.uuid = update.client.uuid;
        this.joinTime = update.client.joinTime;
        this.controller.listening = new Set(update.client.controller);

        // Create MultyxClientObject for all teams
        this.teams = new MultyxClientObject(this, {}, [], true);
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

    private parseEdit(update: RawObject) {
        let route: any = update.team ? this.teams : this.clients;
        if(!route) return;

        // Loop through path to get to object being edited
        for(const p of update.path.slice(0, -1)) {
            // Create new object at path if non-existent
            if(!(p in route)) route[p] = new EditWrapper({});
            route = route[p];
        }

        const prop = update.path.slice(-1)[0];
        route[prop] = new EditWrapper(update.value);
    }

    private parseSelf(update: RawObject) {
        if(update.prop == 'controller') {
            this.controller.listening = new Set(update.data);
        } else if(update.prop == 'uuid') {
            this.uuid = update.data;
        } else if(update.prop == 'constraint') {
            let route = this.uuid == update.data.path[0] ? this.self : this.teams[update.data.path[0]];
            for(const prop of update.data.path.slice(1)) route = route?.[prop];
            if(route === undefined) return;

            route[Unpack]({ [update.data.name]: update.data.args });
        }
    }

    /**
     * Add function to listener queue
     * @param fn Function to call once frame is complete
     */
    [Add](fn: ((...args: any[]) => void)) {
        this.listenerQueue.push(fn);
    }
}