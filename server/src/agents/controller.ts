import Message from "../messages/message";
import { InputUpdate } from "../messages/update";
import { Parse, Self } from "../utils/native";
import type Client from "./client";

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
    listenTo(input: string | string[], callback?: (state: ControllerState) => void) {
        if(!Array.isArray(input)) input = [input];

        input.forEach(inp => {
            this.listening.add(inp);

            if(callback) {
                const events = this.events.get(inp) ?? [];
                events.push(callback);
                this.events.set(inp, events);
            }
        });

        // Relay changes to client
        this.client.server[Self](this.client, 'controller', Array.from(this.listening));
    }

    /**
     * Parse an input update from client
     * @param msg Message containing input data
     */
    [Parse](update: InputUpdate) {
        switch(update.input) {
            case Input.MouseDown: {
                this.state.mouse.x = update.data.x;
                this.state.mouse.y = update.data.y;
                this.state.mouse.down = true;
                this.events.get(Input.MouseDown)?.forEach(c => c(this.state));
                break;
            }

            case Input.MouseUp: {
                this.state.mouse.x = update.data.x;
                this.state.mouse.y = update.data.y;
                this.state.mouse.down = false;
                this.events.get(Input.MouseUp)?.forEach(c => c(this.state));
                break;
            }

            case Input.MouseMove: {
                this.state.mouse.x = update.data.x;
                this.state.mouse.y = update.data.y;
                this.events.get(Input.MouseMove)?.forEach(c => c(this.state));
                break;
            }

            case Input.KeyUp: {
                delete this.state.keys[update.data.code];
                this.events.get(Input.KeyUp)?.forEach(c => c(this.state));
                this.events.get(update.data.code)?.forEach(c => c(this.state));
                break;
            }
            
            case Input.KeyDown: {
                this.state.keys[update.data.code] = true;
                this.events.get(Input.KeyDown)?.forEach(c => c(this.state));
                this.events.get(update.data.code)?.forEach(c => c(this.state));
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