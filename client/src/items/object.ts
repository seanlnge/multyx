import { Message } from "../message";
import { RawObject } from '../types';
import { EditWrapper, Unpack } from "../utils";

import type { MultyxClientItem } from ".";
import MultyxClientItemRouter from "./router";
import MultyxClientValue from "./value";

export default class MultyxClientObject {
    object: RawObject<MultyxClientItem>;
    propertyPath: string[];
    ws: WebSocket;
    constraints: string[];

    get value() {
        const parsed = {};
        for(const prop in this.object) parsed[prop] = this.object[prop];
        return parsed;
    }

    constructor(object: Object | EditWrapper<Object>, propertyPath: string[], ws: WebSocket) {
        this.object = {};
        this.propertyPath = propertyPath;
        this.ws = ws;

        if(object instanceof EditWrapper || object instanceof MultyxClientObject) {
            object = object.value;
        }

        for(const prop in object) {
            let child = object[prop];
            if(child instanceof MultyxClientObject || child instanceof MultyxClientValue) {
                child = child.value;
            }

            this.object[prop] = new (MultyxClientItemRouter(child))(
                child,
                [...propertyPath, prop],
                ws
            );
        }

        if(this.constructor !== MultyxClientObject) return;
        
        return new Proxy(this, {
            get: (o, p) => {
                if(p in o) return o[p];
                return o.get(p);
            },
            set: (o, p, v) => {
                if(p in o) {
                    o[p] = v;
                    return true;
                }
                return o.set(p, v);
            },
            deleteProperty: (o, p) => {
                return o.delete(p, false);
            }
        });
    }

    get(property: any): MultyxClientItem {
        return this.object[property];
    }
    
    set(property: any, value: any): boolean {
        if(value === undefined) return this.delete(property);

        // Only create new MultyxClientItem when needed
        if(this.object[property] instanceof MultyxClientValue) {
            return this.object[property].set(value);
        }

        // If value was set by the server
        if(value instanceof EditWrapper) {
            if(value.value === undefined) return this.delete(property, true);
            value = value.value;
        }
        
        // Creating a new value
        this.object[property] = new (MultyxClientItemRouter(value))(
            value,
            [...this.propertyPath, property],
            this.ws
        );
        return true;
    }

    delete(property: any, native: boolean = false) {
        delete this.object[property];

        if(!native) {
            this.ws.send(Message.Native({
                instruction: 'edit',
                path: [...this.propertyPath, property],
                value: undefined
            }));
        }

        return true;
    }

    /**
     * Unpack constraints from server
     * @param constraints Packed constraints object mirroring MultyxClientObject shape
     */
    [Unpack](constraints: RawObject) {
        for(const prop in constraints) {
            this.object[prop][Unpack](constraints[prop]);
        }
    }
}