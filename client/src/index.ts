import { Message } from "./message";
import { Unpack, EditWrapper, Add } from './utils';
import { RawObject } from "./types";
import { Controller } from "./controller";
import { MultyxClientObject } from "./items";
import { DefaultOptions, Options } from "./options";

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
    controller: Controller;
    
    // Queue of functions to be called after each frame
    private listenerQueue: ((...args: any[]) => void)[];

    Start = Symbol('start');
    Connection = Symbol('connection');
    Disconnect = Symbol('disconnect');
    Edit = Symbol('edit');
    Public = Symbol('public');
    Native = Symbol('native');
    Custom = Symbol('custom');
    Any = Symbol('any');

    constructor(options: Options = {}) {
        options = { ...DefaultOptions, ...options };

        this.ws = new WebSocket(`ws${options.secure ? 's' : ''}://${options.uri}:${options.port}/`);
        this.ping = 0;
        this.events = new Map();
        this.self = {};
        this.all = {};
        this.teams = {};
        this.clients = {};
        this.controller = new Controller(this.ws);
        this.listenerQueue = [];

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

    private parseNativeEvent(msg: Message) {
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

                // Other data change
                case 'self': {
                    this.parseSelf(update);
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

        this.listenerQueue.forEach(x => x());
        this.listenerQueue = [];
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
        this.clients = new MultyxClientObject(this, {}, [], false);
        for(const [uuid, client] of Object.entries(update.clients)) {
            this.clients[uuid] = new EditWrapper(client);
        };
        this.self = new MultyxClientObject(this, new EditWrapper(update.client.self), [this.uuid], true);

        // Apply all constraints on self and teams
        for(const [uuid, table] of Object.entries(update.constraintTable)) {
            const obj = this.uuid == uuid ? this.self : this.teams[uuid];
            obj[Unpack](table);
        }

        this.events.get(this.Start)?.forEach(c => c(update));
    }

    private parseEdit(update: RawObject) {
        const newTeam = update.team && (this.teams[update.path[0]] === undefined);
        let route: any = update.team ? this.teams : this.clients;

        // Client joined a new team
        if(newTeam) this.teams[update.path[0]] = new EditWrapper({});
    
        // Loop through path to get to object being edited
        for(const p of update.path.slice(0, -1)) {
            // Create new object at path if non-existent
            if(route[p] === undefined) route[p] = new EditWrapper({});
            route = route[p];

        }
        const prop = update.path.slice(-1)[0];
        route[prop] = new EditWrapper(update.value);
        
        this.events.get(this.Edit)?.forEach(c => c(update));
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

export default new Multyx();