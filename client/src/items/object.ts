import { Message } from "../message";
import { RawObject } from '../types';
import { Add, Edit, EditWrapper, Unpack } from "../utils";

import type Multyx from '../index';
import { IsMultyxClientItem, type MultyxClientItem } from ".";
import MultyxClientItemRouter from "./router";
import MultyxClientValue from "./value";

export default class MultyxClientObject {
    protected object: RawObject<MultyxClientItem>;
    private multyx: Multyx;
    propertyPath: string[];
    editable: boolean;

    private setterListeners: ((key: any, value: any) => void)[];

    get value() {
        const parsed = {};
        for(const prop in this.object) parsed[prop] = this.object[prop];
        return parsed;
    }

    [Edit](updatePath: string[], value: any) {
        if(updatePath.length == 1) {
            this.set(updatePath[0], new EditWrapper(value));
            return;
        }

        if(updatePath.length == 0 && this.multyx.options.verbose) {
            console.error("Update path is empty. Attempting to edit MultyxClientObject with no path.");
        }

        if(!this.has(updatePath[0])) {
            this.set(updatePath[0], new EditWrapper({}));
        }
        this.get(updatePath[0])[Edit](updatePath.slice(1), value);
    }

    constructor(multyx: Multyx, object: RawObject | EditWrapper<RawObject>, propertyPath: string[] = [], editable: boolean) {
        this.object = {};
        this.propertyPath = propertyPath;
        this.multyx = multyx;
        this.editable = editable;

        this.setterListeners = [];

        const isEditWrapper = object instanceof EditWrapper;
        if(object instanceof MultyxClientObject) object = object.value;
        if(object instanceof EditWrapper) object = object.value;

        for(const prop in object) {
            this.set(prop, isEditWrapper
                ? new EditWrapper(object[prop])
                : object[prop]
            );
        }

        if(this.constructor !== MultyxClientObject) return;
        
        return new Proxy(this, {
            has: (o, p) => {
                return o.has(p);
            },
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

    has(property: any): boolean {
        return property in this.object;
    }

    get(property: any): MultyxClientItem {
        return this.object[property];
    }
    
    set(property: any, value: any): boolean {
        if(value === undefined) return this.delete(property);

        // Only create new MultyxClientItem when needed
        if(this.object[property] instanceof MultyxClientValue && !IsMultyxClientItem(value)) return this.object[property].set(value);

        // If value was deleted by the server
        if(value instanceof EditWrapper && value.value === undefined) return this.delete(property, true);
        
        // Attempting to edit property not editable to client
        if(!(value instanceof EditWrapper) && !this.editable) {
            if(this.multyx.options.verbose) {
                console.error(`Attempting to set property that is not editable. Setting '${this.propertyPath.join('.') + '.' + property}' to ${value}`);
            }
            return false;
        }
        
        // Creating a new value
        this.object[property] = new (MultyxClientItemRouter(
            value instanceof EditWrapper ? value.value : value
        ))(this.multyx, value, [...this.propertyPath, property], this.editable);

        // We have to push into queue, since object may not be fully created
        // and there may still be more updates to parse
        for(const listener of this.setterListeners) {
            this.multyx[Add](() => {
                if(this.has(property)) listener(property, this.get(property));
            });
        }

        // Relay change to server if not edit wrapped
        if(!(value instanceof EditWrapper)) this.multyx.ws.send(Message.Native({
            instruction: 'edit',
            path: [...this.propertyPath, property],
            value: this.object[property].value
        }));
        
        return true;
    }

    delete(property: any, native: boolean = false) {
        // Attempting to edit property not editable by client
        if(!this.editable && !native) {
            if(this.multyx.options.verbose) {
                console.error(`Attempting to delete property that is not editable. Deleting '${this.propertyPath.join('.') + '.' + property}'`);
            }
            return false;
        }

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
     * Create a callback function that gets called for any current or future property in object
     * @param callbackfn Function to call for every property
     */
    forAll(callbackfn: (key: any, value: any) => void) {
        for(let prop in this.object) {
            callbackfn(prop, this.get(prop));
        }
        this.setterListeners.push(callbackfn);
    }

    keys(): any[] {
        return Object.keys(this.object);
    }

    values(): any[] {
        return Object.values(this.object);
    }

    entries(): [any, any][] {
        const entryList: [any, any][] = [];
        for(let prop in this.object) {
            entryList.push([prop, this.get(prop)]);
        }
        return entryList;
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