import { MultyxClients, MultyxObject, MultyxTeam, MultyxValue } from "./multyx";
import { WebSocket } from "ws";
import { RawObject } from "./types";
import { MultyxServer } from "./index";
import { EditUpdate } from "./update";
import Message from "./message";

const UUIDSet = new Set();
function generateUUID(length: number = 8, radix: number = 36): string {
    const unit = radix ** (length - 1);
    const uuid = Math.floor(Math.random() * (radix * unit - unit) + unit).toString(radix);

    if(UUIDSet.has(uuid)) return generateUUID(length, radix);
    UUIDSet.add(uuid);
    return uuid;
}

export class Client {
    data: RawObject;
    shared: MultyxObject;
    controller: Controller;
    teams: Set<MultyxTeam>;
    ws: WebSocket;
    server: MultyxServer;
    uuid: string;
    joinTime: number;
    onUpdate: (deltaTime: number, controllerState: ControllerState) => void;

    constructor(ws: WebSocket, server: MultyxServer) {
        this.data = {};
        this.shared = new MultyxObject({}, this);
        this.controller = new Controller(this);
        this.teams = new Set();
        this.ws = ws;
        this.server = server;
        this.uuid = generateUUID();
        this.joinTime = Date.now();
    }

    /**
     * Create client-side representation of client object
     */
    parse(): RawObject {
        return {
            uuid: this.uuid,
            joinTime: this.joinTime,
            controller: Array.from(this.controller.listening.values()),
            shared: this.shared.raw,
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
     * 
     * @param input Input to listen for; If type `string`, client listens for keyboard event code `input`
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

    parseUpdate(msg: Message) {
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