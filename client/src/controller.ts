import { Message } from "./message";
import { RawObject } from "./types";

export class Controller {
    listening: Set<string>;
    ws: WebSocket;

    keys: RawObject<boolean>;
    mouse: {
        x: number, y: number, down: boolean, // Mouse state
        centerX: number, centerY: number,    // Mouse translation
        scaleX: number, scaleY: number       // Mouse position scaling
    };

    constructor(ws: WebSocket) {
        this.listening = new Set();
        this.ws = ws;

        this.keys = {};
        this.mouse = {
            x: NaN,
            y: NaN,
            down: false,
            centerX: 0,
            centerY: 0,
            scaleX: 1,
            scaleY: 1
        };

        document.addEventListener('keydown', e => {
            // When holding down key
            if(this.keys[e.code]) {
                if(this.listening.has('keyhold'))
                    this.relayInput('keyhold', { code: e.code });
                return;
            }
            this.keys[e.code] = true;
            if(this.listening.has(e.code))
                this.relayInput('keydown', { code: e.code });
        });
        document.addEventListener('keyup', e => {
            delete this.keys[e.code];
            if(this.listening.has(e.code))
                this.relayInput('keyup', { code: e.code });
        });

        // Mouse input events
        document.addEventListener('mousedown', _ => {
            this.mouse.down = true;
            if(this.listening.has('mousedown'))
                this.relayInput('mousedown');
        });
        document.addEventListener('mouseup', _ => {
            this.mouse.down = false;
            if(this.listening.has('mouseup'))
                this.relayInput('mouseup');
        });
        document.addEventListener('mousemove', e => {
            this.mouse.x = (e.clientX - this.mouse.centerX) / this.mouse.scaleX;
            this.mouse.y = (e.clientY - this.mouse.centerY) / this.mouse.scaleY;
            if(this.listening.has('mousemove'))
                this.relayInput('mousemove', {
                    x: this.mouse.x, y: this.mouse.y
                });
        })
    }

    /**
     * @param anchor HTML Element to read mouse position relative to
     * @param centerX Anchor x-value corresponding to mouse position x-value of 0
     * @param centerY Anchor y-value corresponding to mouse position y-value of 0
     * @param scaleX Number of anchor pixels corresponding to a mouse position x-value change of 1
     * @param scaleY Number of anchor pixels corresponding to a mouse position y-value change of 1
     */
    mapMousePosition(anchor: HTMLElement, centerX: number = 0, centerY: number = 0, scaleX: number = 1, scaleY: number = scaleX) {
        const ratioX = window.innerWidth / (anchor instanceof HTMLCanvasElement
            ? anchor.width
            : anchor.clientWidth
        );
        const ratioY = window.innerHeight / (anchor instanceof HTMLCanvasElement
            ? anchor.height
            : anchor.clientHeight
        );

        this.mouse.centerX = centerX * ratioX;
        this.mouse.centerY = centerY * ratioY;
        this.mouse.scaleX = scaleX * ratioX;
        this.mouse.scaleY = scaleY * ratioY;
    }

    addUnpacked(controller: string[]) {
        controller.forEach(c => {
            this.listening.add(c);
        });
    }

    relayInput(input: string, data?: RawObject) {
        if(this.ws.readyState !== 1) {
            throw new Error('Websocket connection is ' + (this.ws.readyState == 2 ? 'closing' : 'closed'));
        }

        this.ws.send(Message.Native({
            instruction: 'input',
            input: input,
            ...(data ? { data } : {})
        }));
    }
}