import { Message } from "../message";
import { RawObject } from '../types';
import { Add, Done, EditWrapper, Unpack } from "../utils";

import type Multyx from '../index';
import type { MultyxClientItem } from ".";
import MultyxClientItemRouter from "./router";
import MultyxClientValue from "./value";

export default class MultyxClientObject {
    private object: RawObject<MultyxClientItem>;
    private multyx: typeof Multyx;
    propertyPath: string[];
    constraints: string[];
    editable: boolean;


    private setterListeners: ((key: any, value: any) => void)[]

    get value() {
        const parsed = {};
        for(const prop in this.object) parsed[prop] = this.object[prop];
        return parsed;
    }

    constructor(multyx: typeof Multyx, object: RawObject | EditWrapper<RawObject>, propertyPath: string[] = [], editable: boolean) {
        this.object = {};
        this.propertyPath = propertyPath;
        this.multyx = multyx;
        this.editable = editable;

        this.setterListeners = [];

        if(object instanceof MultyxClientObject) object = object.value;

        for(const prop in (object instanceof EditWrapper ? object.value : object)) {
            this.set(prop, object instanceof EditWrapper
                ? new EditWrapper(object.value[prop])
                : object[prop]
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
        if(this.object[property] instanceof MultyxClientValue) return this.object[property].set(value);

        // If value was deleted by the server
        if(value instanceof EditWrapper && value.value === undefined) return this.delete(property, true);
        
        // Attempting to edit property not editable to client
        if(!(value instanceof EditWrapper) && !this.editable) return false;
        
        // Creating a new value
        this.object[property] = new (MultyxClientItemRouter(
            value instanceof EditWrapper ? value.value : value
        ))(this.multyx, value, [...this.propertyPath, property]);

        // We have to push into queue, since object may not be fully created
        // and there may still be more updates to parse
        for(const listener of this.setterListeners) {
            this.multyx[Add](() => listener(property, this.get(property)));
        }

        // Relay change to server if not edit wrapped
        if(!(value instanceof EditWrapper)) this.multyx.ws.send(Message.Native({
            instruction: 'edit',
            path: this.propertyPath,
            value: this.object[property].value
        }));
        return true;
    }

    delete(property: any, native: boolean = false) {
        // Attempting to edit property not editable by client
        if(!this.editable && !native) return false;

        delete this.object[property];

        if(!native) {
            this.multyx.ws.send(Message.Native({
                instruction: 'edit',
                path: [...this.propertyPath, property],
                value: undefined
            }));
        }

        return true;
    }

    /**
     * Create a callback function that gets called for any current or future element in list
     * @param callbackfn Function to call for every element
     */
    forAll(callbackfn: (key: any, value: any) => any) {
        for(let prop in this.object) {
            callbackfn(prop, this.get(prop));
        }
        this.setterListeners.push(callbackfn);
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