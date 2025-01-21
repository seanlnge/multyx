import { Message } from "./message";
import { Unpack, EditWrapper, Interpolate, Lerp, PredictiveLerp } from './utils';
import { RawObject } from "./types";
import { Controller } from "./controller";
import MultyxClientObject from "./items/object";
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

    constructor() {
        this.ws = new WebSocket('ws://localhost:8080/');
        this.ping = 0;
        this.events = new Map();
        this.self = {};
        this.all = {};
        this.teams = {};
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

                // Other data change
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
        this.controller.listening = new Set(update.client.controller);

        for(const team of Object.keys(update.teams)) {
            this.teams[team] = new MultyxClientObject(update.teams[team], [team], this.ws);
        }
        
        this.all = this.teams['all'];

        this.self = new MultyxClientObject(update.client.self, [this.uuid], this.ws);
        console.log(update.constraintTable);
        this.self[Unpack](update.constraintTable);

        this.clients = update.clients;
        this.clients[this.uuid] = this.self;

        this.events.get(this.Start)?.forEach(c => c(update));
    }

    private parseEdit(update: RawObject) {
        const newTeam = update.team && !(update.path[0] in this.teams);
        let route: any = update.team ? this.teams : this.clients;
    
        // Loop through path to get to object being edited
        for(const p of update.path.slice(0, -1)) {
            // Create new object at path if non-existent
            if(route[p] === undefined) {
                route[p] = route instanceof MultyxClientObject
                    ? new EditWrapper({})
                    : {};
            }
            route = route[p];
        }
        const prop = update.path.slice(-1)[0];

        // Check if editable is proxied to avoid sending change to server
        route[prop] = route instanceof MultyxClientObject
            ? new EditWrapper(update.value)
            : update.value;

        // Client joined a new team
        if(newTeam) {
            this.teams[update.path[0]] = new MultyxClientObject(
                this.teams[update.path[0]],
                [update.path[0]],
                this.ws
            );
        }
        
        this.events.get(this.Edit)?.forEach(c => c(update));
    }
}

export default new Multyx();