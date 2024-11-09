"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Controller = exports.Input = exports.Client = void 0;
const multyx_1 = require("./multyx");
const UUIDSet = new Set();
function generateUUID(length = 8, radix = 36) {
    const unit = radix ** (length - 1);
    const uuid = Math.floor(Math.random() * (radix * unit - unit) + unit).toString(radix);
    if (UUIDSet.has(uuid))
        return generateUUID(length, radix);
    UUIDSet.add(uuid);
    return uuid;
}
class Client {
    constructor(ws, server) {
        this.data = {};
        this.self = new multyx_1.MultyxObject({}, this);
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
    parse() {
        return {
            uuid: this.uuid,
            joinTime: this.joinTime,
            controller: Array.from(this.controller.listening.values()),
            self: this.self.raw,
        };
    }
}
exports.Client = Client;
var Input;
(function (Input) {
    Input["MouseMove"] = "mousemove";
    Input["MouseDown"] = "mousedown";
    Input["MouseUp"] = "mouseup";
    Input["KeyDown"] = "keydown";
    Input["KeyHold"] = "keyhold";
    Input["KeyUp"] = "keyup";
    Input["KeyPress"] = "keypress";
    Input["Shift"] = "Shift";
    Input["Alt"] = "Alt";
    Input["Tab"] = "Tab";
    Input["Control"] = "Control";
    Input["Enter"] = "Enter";
    Input["Escape"] = "Escape";
    Input["Delete"] = "Delete";
    Input["Space"] = "Space";
    Input["CapsLock"] = "CapsLock";
    Input["LeftShift"] = "ShiftLeft";
    Input["RightShift"] = "ShiftRight";
    Input["LeftControl"] = "ControlLeft";
    Input["RightControl"] = "ControlRight";
    Input["LeftAlt"] = "AltLeft";
    Input["RightAlt"] = "AltRight";
    Input["UpArrow"] = "ArrowUp";
    Input["DownArrow"] = "ArrowDown";
    Input["LeftArrow"] = "ArrowLeft";
    Input["RightArrow"] = "ArrowRight";
})(Input || (exports.Input = Input = {}));
class Controller {
    constructor(client) {
        this.client = client;
        this.state = { keys: {}, mouse: { x: 0, y: 0, down: false } };
        this.listening = new Set();
        this.events = new Map();
    }
    /**
     *
     * @param input Input to listen for; If type `string`, client listens for keyboard event code `input`
     */
    listenTo(input, callback) {
        if (!Array.isArray(input))
            input = [input];
        input.forEach(inp => {
            var _a;
            this.listening.add(inp);
            if (callback) {
                const events = (_a = this.events.get(inp)) !== null && _a !== void 0 ? _a : [];
                events.push(callback);
                this.events.set(inp, events);
            }
        });
    }
    parseUpdate(msg) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        switch (msg.data.input) {
            case Input.MouseDown: {
                this.state.mouse.down = true;
                (_a = this.events.get(Input.MouseDown)) === null || _a === void 0 ? void 0 : _a.forEach(c => c(this.state));
                break;
            }
            case Input.MouseUp: {
                this.state.mouse.down = false;
                (_b = this.events.get(Input.MouseUp)) === null || _b === void 0 ? void 0 : _b.forEach(c => c(this.state));
                break;
            }
            case Input.MouseMove: {
                this.state.mouse.x = msg.data.data.x;
                this.state.mouse.y = msg.data.data.y;
                (_c = this.events.get(Input.MouseMove)) === null || _c === void 0 ? void 0 : _c.forEach(c => c(this.state));
                break;
            }
            case Input.KeyUp: {
                delete this.state.keys[msg.data.data.code];
                (_d = this.events.get(Input.KeyUp)) === null || _d === void 0 ? void 0 : _d.forEach(c => c(this.state));
                (_e = this.events.get(msg.data.data.code)) === null || _e === void 0 ? void 0 : _e.forEach(c => c(this.state));
                break;
            }
            case Input.KeyDown: {
                this.state.keys[msg.data.data.code] = true;
                (_f = this.events.get(Input.KeyDown)) === null || _f === void 0 ? void 0 : _f.forEach(c => c(this.state));
                (_g = this.events.get(msg.data.data.code)) === null || _g === void 0 ? void 0 : _g.forEach(c => c(this.state));
                break;
            }
            case Input.KeyHold: {
                (_h = this.events.get(Input.KeyHold)) === null || _h === void 0 ? void 0 : _h.forEach(c => c(this.state));
                break;
            }
            default: {
                console.log('bro how tf you get here');
            }
        }
    }
}
exports.Controller = Controller;
