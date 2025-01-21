import { Message } from "./message";
import { RawObject } from "./types";

export class Controller {
    listening: Set<string>;
    ws: WebSocket;

    keys: RawObject<boolean>;
    mouse: {
        x: number, y: number, down: boolean, // Mouse state
        centerX: number, centerY: number,    // Translation in reference to top left of document body, scaled by unit pixels
        scaleX: number, scaleY: number       // Scaling in reference to unit pixels
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
            if(this.keys[e.key] || this.keys[e.code]) {
                if(this.keys[e.key] && this.listening.has('keyhold')) {
                    this.relayInput('keyhold', { code: e.key });
                }
                if(this.keys[e.code] && this.listening.has('keyhold')) {
                    this.relayInput('keyhold', { code: e.code });
                }
                return;
            }
            this.keys[e.key] = true;
            this.keys[e.code] = true;
            if(this.listening.has(e.key)) this.relayInput('keydown', { code: e.key });
            if(this.listening.has(e.code)) this.relayInput('keydown', { code: e.code });
        });
        document.addEventListener('keyup', e => {
            delete this.keys[e.key];
            delete this.keys[e.code];
            if(this.listening.has(e.key)) this.relayInput('keyup', { code: e.key });
            if(this.listening.has(e.code)) this.relayInput('keyup', { code: e.code });
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
     * Map the canvas to specified top left and bottom right positions
     * @param canvas HTML canvas element
     * @param canvasContext 2D rendering context for canvas
     * @param top Canvas position to correspond to top of canvas
     * @param left Canvas position to correspond to left of canvas
     * @param bottom Canvas position to correspond to bottom of canvas
     * @param right Canvas position to correspond to right of canvas
     * @param anchor Anchor the origin at a specific spot on the canvas
     */
    mapCanvasPosition(canvas: HTMLCanvasElement, position: {
        top?: number, bottom?: number, left?: number, right?: number,
        anchor?: 'center' | 'left' | 'right' | 'top' | 'bottom' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright'
    }) {
        const t = 'top' in position;
        const b = 'bottom' in position;
        const l = 'left' in position;
        const r = 'right' in position;
        const a = position.anchor;

        const bounding = canvas.getBoundingClientRect();

        const error = (included: boolean, ...pieces: string[]) => {
            const p1 = included ? "Cannot include value for " : "Must include value for ";
            const p2 = pieces.length == 1 ? pieces[0] : pieces.slice(0, -1).join(', ') + (included ? ' and ' : ' or ') + pieces.slice(-1)[0];
            const p3 = a ? " if anchoring at " + a : " if not anchoring";
            console.error(p1 + p2 + p3);
        }
        
        const wToH = bounding.width / bounding.height;
        const hToW = bounding.height / bounding.width;

        if(Number.isNaN(wToH) || Number.isNaN(hToW)) {
            console.error("Canvas element bounding box is flat, canvas must be present on the screen");
        }

        // mb bruh jus trust it works
        if(!a) {
            if(!t && !b) return error(false, 'top', 'bottom');
            else if(!b) position.bottom = position.top + canvas.height;
            else if(!t) position.top = position.bottom - canvas.height;

            if(!l && !r) return error(false, 'left', 'right');
            else if(!r) position.right = position.left + canvas.width;
            else if(!l) position.left = position.right - canvas.width;
        } else if(a == 'center') {
            if(t && b && position.top !== -position.bottom
            || l && r && position.left !== -position.right) return error(true, 'top', 'bottom', 'left', 'right');

            if(t) {
                position.left = l ? position.left : r ? -position.right : -Math.abs(wToH * position.top);
                position.right = l ? -position.left : r ? position.right : Math.abs(wToH * position.top);
                position.bottom = -position.top;
            } else if(b) {
                position.left = l ? position.left : r ? -position.right : -Math.abs(wToH * position.bottom);
                position.right = l ? -position.left : r ? position.right : Math.abs(wToH * position.bottom);
                position.top = -position.bottom;
            } else if(l) {
                position.top = t ? position.top : b ? -position.bottom : -Math.abs(hToW * position.left);
                position.bottom = t ? -position.top : b ? position.bottom : Math.abs(hToW * position.left);
                position.right = -position.left;
            } else if(r) {
                position.top = t ? position.top : b ? -position.bottom : -Math.abs(hToW * position.right);
                position.bottom = t ? -position.top : b ? position.bottom : Math.abs(hToW * position.right);
                position.left = -position.right;
            }
        } else if(a == 'bottom') {
            if(!l && !r && !t) return error(false, 'left', 'right', 'top');
            if(position.bottom) return error(true, 'bottom');
            position.bottom = 0;

            if(l) {
                position.top ??= Math.abs(hToW * position.left * 2);
                position.right ??= -position.left;
            } else if(r) {
                position.top ??= Math.abs(hToW * position.right * 2);
                position.left ??= -position.right;
            } else {
                position.left = -Math.abs(wToH * position.top / 2);
                position.right = -position.left;
            }
        } else if(a == 'top') {
            if(!l && !r && !b) return error(false, 'left', 'right', 'bottom');
            if(position.top) return error(true, 'top');
            position.top = 0;

            if(l) {
                position.bottom ??= Math.abs(hToW * position.left * 2);
                position.right ??= -position.left;
            } else if(r) {
                position.bottom ??= Math.abs(hToW * position.right * 2);
                position.left ??= -position.right;
            } else {
                position.left = -Math.abs(wToH * position.bottom / 2);
                position.right = -position.left;
            }
        } else if(a == 'left') { 
            if(!t && !b && !r) return error(false, 'top', 'bottom', 'right');
            if(l) return error(true, 'left');
            position.left = 0;

            if(t) {
                position.right ??= -Math.abs(wToH * position.top * 2);
                position.bottom ??= -position.top;
            } else if(b) {
                position.right ??= Math.abs(wToH * position.bottom * 2);
                position.top ??= -position.bottom;
            } else {
                position.top = -Math.abs(hToW * position.right / 2);
                position.bottom = -position.top;
            }
        } else if(a == 'right') { 
            if(!t && !b && !l) return error(false, 'top', 'bottom', 'left');
            if(r) return error(true, 'right');
            position.right = 0;

            if(t) {
                position.left ??= -Math.abs(wToH * position.top * 2);
                position.bottom ??= -position.top;
            } else if(b) {
                position.left ??= Math.abs(wToH * position.bottom * 2);
                position.top ??= -position.bottom;
            } else {
                position.top = -Math.abs(hToW * position.right / 2);
                position.bottom = -position.top;
            }
        } else if(a == 'topleft') {
            if(!r && !b) return error(false, 'right', 'bottom');
            if(l || t) return error(true, 'left', 'top');
            position.left = position.top = 0;

            if(r) position.bottom = Math.abs(hToW * position.right);
            else position.right = Math.abs(wToH * position.bottom);
        } else if(a == 'topright') {
            if(!l && !b) return error(false, 'left', 'bottom');
            if(r || t) return error(true, 'right', 'top');
            position.right = position.top = 0;

            if(l) position.bottom = Math.abs(hToW * position.left);
            else position.left = Math.abs(wToH * position.bottom);
        } else if(a == 'bottomleft') {
            if(!r && !t) return error(false, 'right', 'top');
            if(b || l) return error(true, 'bottom', 'left');
            position.left = position.bottom = 0;

            if(r) position.top = Math.abs(hToW * position.right);
            else position.right = Math.abs(wToH * position.top);
        } else if(a == 'bottomright') {
            if(!t && !l) return error(false, 'top', 'left');
            if(r || b) return error(true, 'bottom', 'right');
            position.right = position.bottom = 0;

            if(l) position.top = Math.abs(hToW * position.left);
            else position.left = Math.abs(wToH * position.top);
        }

        const ctx = canvas.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        canvas.width = Math.floor(Math.abs(position.right-position.left));
        canvas.height = Math.floor(Math.abs(position.bottom-position.top));
        if(position.right < position.left) ctx.scale(-1, 1);
        if(position.top > position.bottom) ctx.scale(1, -1);

        console.log(position);

        ctx.translate(-position.left, -position.top);
    }

    /**
     * @param centerX Anchor x-value corresponding to mouse position x-value of 0
     * @param centerY Anchor y-value corresponding to mouse position y-value of 0
     * @param anchor HTML Element to read mouse position relative to
     * @param scaleX Number of anchor pixels corresponding to a mouse position x-value change of 1
     * @param scaleY Number of anchor pixels corresponding to a mouse position y-value change of 1
     */
    mapMousePosition(centerX: number, centerY: number, anchor: HTMLElement = document.body, scaleX: number = 1, scaleY: number = scaleX) {   
        const ratioX = window.innerWidth / (anchor instanceof HTMLCanvasElement
            ? anchor.width
            : anchor.clientWidth
        );
        const ratioY = window.innerHeight / (anchor instanceof HTMLCanvasElement
            ? anchor.height
            : anchor.clientHeight
        );

        const bounding = anchor.getBoundingClientRect();
        this.mouse.centerX = bounding.left + centerX * ratioX;
        this.mouse.centerY = bounding.top + centerY * ratioY;
        this.mouse.scaleX = scaleX * ratioX;
        this.mouse.scaleY = scaleY * ratioY;
    }

    /**
     * Map mouse position to the corresponding canvas coordinates on screen
     * @param canvas Canvas element in DOM
     */
    mapMouseToCanvas(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext("2d");
        const transform = ctx.getTransform();
        const bounding = canvas.getBoundingClientRect();
        
        // Ratio between canvas scale to unit pixels
        const canvasRatioX = bounding.width / canvas.width;
        const canvasRatioY = bounding.height / canvas.height;

        this.mouse.centerX = bounding.left + transform.e * canvasRatioX;
        this.mouse.centerY = bounding.top + transform.f * canvasRatioY;
        
        this.mouse.scaleX = canvasRatioX * transform.a;
        this.mouse.scaleY = canvasRatioY * transform.d;
    }

    private relayInput(input: string, data?: RawObject) {
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