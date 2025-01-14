import { MultyxObject, MultyxValue } from "./multyx";
import { WebSocket } from "ws";
import { RawObject } from "./types";
import { MultyxServer } from "./index";
import Message from "./message";
import { GenerateUUID } from "./utils";

export class Client {
    data: RawObject;
    self: MultyxObject;
    controller: Controller;
    teams: Set<MultyxTeam>;
    ws: WebSocket;
    server: MultyxServer;
    uuid: string;
    joinTime: number;
    onUpdate: (deltaTime: number, controllerState: ControllerState) => void;

    constructor(ws: WebSocket, server: MultyxServer) {
        this.data = {};
        this.self = new MultyxObject({}, this);
        this.controller = new Controller(this);
        this.teams = new Set();
        this.ws = ws;
        this.server = server;
        this.uuid = GenerateUUID();
        this.joinTime = Date.now();
    }

    send(eventName: string, data: any) {
        this.ws.send(Message.Create(eventName, data));
    }

    /**
     * Create client-side representation of client object
     */
    parse(): RawObject {
        return {
            uuid: this.uuid,
            joinTime: this.joinTime,
            controller: Array.from(this.controller.listening.values()),
            self: this.self.raw,
        }
    }
}

export enum Input {
    MouseMove = "mousemove",
    MouseDown = "mousedown",
    MouseUp = "mouseup",

    KeyDown = "keydown",
    KeyHold = "keyhold",
    KeyUp = "keyup",
    KeyPress = "keypress",

    Shift = "Shift",
    Alt = "Alt",
    Tab = "Tab",
    Control = "Control",
    Enter = "Enter",
    Escape = "Escape",
    Delete = "Delete",
    Space = "Space",
    CapsLock = "CapsLock",

    LeftShift = "ShiftLeft",
    RightShift = "ShiftRight",
    LeftControl = "ControlLeft",
    RightControl= "ControlRight",
    LeftAlt = "AltLeft",
    RightAlt = "AltRight",
    
    UpArrow = "ArrowUp",
    DownArrow = "ArrowDown",
    LeftArrow = "ArrowLeft",
    RightArrow = "ArrowRight",
}

export type ControllerState = {
    keys: { [key: string]: boolean },
    mouse: { x: number, y: number, down: boolean }
}

export class Controller {
    client: Client;
    state: ControllerState;
    listening: Set<string>;
    events: Map<string, ((state: ControllerState) => void)[]>

    constructor(client: Client) {
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
    listenTo(input: Input | string | (Input | string)[], callback?: (state: ControllerState) => void) {
        if(!Array.isArray(input)) input = [input];

        input.forEach(inp => {
            this.listening.add(inp);

            if(callback) {
                const events = this.events.get(inp) ?? [];
                events.push(callback);
                this.events.set(inp, events);
            }
        });
    }

    __parseUpdate(msg: Message) {
        switch(msg.data.input) {
            case Input.MouseDown: {
                this.state.mouse.down = true;
                this.events.get(Input.MouseDown)?.forEach(c => c(this.state));
                break;
            }

            case Input.MouseUp: {
                this.state.mouse.down = false;
                this.events.get(Input.MouseUp)?.forEach(c => c(this.state));
                break;
            }

            case Input.MouseMove: {
                this.state.mouse.x = msg.data.data.x;
                this.state.mouse.y = msg.data.data.y;
                this.events.get(Input.MouseMove)?.forEach(c => c(this.state));
                break;
            }

            case Input.KeyUp: {
                delete this.state.keys[msg.data.data.code];
                this.events.get(Input.KeyUp)?.forEach(c => c(this.state));
                this.events.get(msg.data.data.code)?.forEach(c => c(this.state));
                break;
            }
            
            case Input.KeyDown: {
                this.state.keys[msg.data.data.code] = true;
                this.events.get(Input.KeyDown)?.forEach(c => c(this.state));
                this.events.get(msg.data.data.code)?.forEach(c => c(this.state));
                break;
            }

            case Input.KeyHold: {
                this.events.get(Input.KeyHold)?.forEach(c => c(this.state));
                break;
            }

            default: {
                console.log('bro how tf you get here');
            }
        }
    }
}

export class MultyxTeam {
    clients: Set<Client>;
    public: Set<MultyxValue>;
    self: MultyxObject;
    server: MultyxServer;
    name: string;

    /**
     * Creates a group of clients sharing public data
     * @param clients List of clients to add to team
     * @returns MultyxTeam object
     */
    constructor(name: string, clients?: Set<Client> | Client[]) {
        this.public = new Set();
        this.self = new MultyxObject({}, this);
        //this.uuid = GenerateUUID();
        this.name = name;

        if(!clients) {
            this.clients = new Set();
            return;
        }
        
        this.clients = new Set();
        clients.forEach(c => {
            c.teams.add(this);
            this.clients.add(c);
        });

        this.server = this.clients.values().next().value?.server ?? this.server;
    }

    /**
     * Send an event to all clients on team
     * @param eventName Name of client event
     * @param data Data to send
     */
    send(eventName: string, data: any) {
        const msg = Message.Create(eventName, data);
        for(const client of this.clients) {
            client.ws.send(msg);
        }
    }

    /**
     * Retrieve a client object in the team
     * @param uuid UUID of client to retrieve
     * @returns Client if exists in team, else null
     */
    getClient(uuid: string) {
        const client = Array.from(this.clients.values()).find(x => x.uuid == uuid);
        return client ?? null;
    }

    /**
     * Add a client into the team
     * @param client Client object to add to team
     */
    addClient(client: Client) {
        this.clients.add(client);
        if(!this.server) this.server = client.server;
        client.teams.add(this);
    }

    /**
     * Remove a client from the team
     * @param client Client object to remove from team
     */
    removeClient(client: Client) {
        this.clients.delete(client);
        client.teams.delete(this);
    }

    /**
     * Get raw 
     * @returns 
     */
    getRawPublic(): Map<Client, RawObject> {
        const parsed = new Map();
        this.clients.forEach(c =>
            parsed.set(c, c.self.getRawPublic(this))
        );
        return parsed;
    }
}

export const MultyxClients = new MultyxTeam("all");