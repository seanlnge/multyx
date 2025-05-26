import { Message } from "../message";
import { RawObject } from '../types';
import { Done, Edit, EditWrapper, Unpack } from "../utils";

import type Multyx from '../index';
import { IsMultyxClientItem, type MultyxClientList, type MultyxClientItem } from ".";
import MultyxClientItemRouter from "./router";
import MultyxClientValue from "./value";

export default class MultyxClientObject {
    protected object: RawObject<MultyxClientItem>;
    private multyx: Multyx;
    propertyPath: string[];
    editable: boolean;

    private editCallbacks: ((key: any, value: any) => void)[] = [];

    get value() {
        const parsed = {};
        for(const prop in this.object) parsed[prop] = this.object[prop];
        return parsed;
    }

    addEditCallback(callback: (key: any, value: any) => void) {
        this.editCallbacks.push(callback);
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
            get: (o, p: string) => {
                if(p in o) return o[p];
                return o.get(p);
            },
            set: (o, p: string, v) => {
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

    get(property: string | string[]): MultyxClientItem {
        if(typeof property === 'string') return this.object[property];
        if(property.length == 0) return this;
        if(property.length == 1) return this.object[property[0]];

        const next = this.object[property[0]];
        if(!next || (next instanceof MultyxClientValue)) return undefined;
        return next.get(property.slice(1));
    }

    private recursiveSet(path: string[], value: any): boolean {
        if(path.length == 0) {
            if(this.multyx.options.verbose) {
                console.error(`Attempting to edit MultyxClientObject with no path. Setting '${this.propertyPath.join('.')}' to ${value}`);
            }
            return false;
        }
        if(path.length == 1) return this.set(path[0], value);

        let next = this.get(path[0]);
        if(next instanceof MultyxClientValue || next == undefined) {
            if(isNaN(parseInt(path[1]))) {
                this.set(path[0], new EditWrapper({}));
                next = this.get(path[0]) as MultyxClientObject;
            } else {
                this.set(path[0], new EditWrapper([]));
                next = this.get(path[0]) as MultyxClientList;
            }
        }
        return next.set(path.slice(1), value);
    }
    
    set(property: string | string[], value: any): boolean {
        if(Array.isArray(property)) return this.recursiveSet(property, value);

        const serverSet = value instanceof EditWrapper;
        const allowed = serverSet || this.editable;
        if(serverSet || IsMultyxClientItem(value)) value = value.value;
        if(value === undefined) return this.delete(property, serverSet);

        // Only create new MultyxClientItem when needed
        if(this.object[property] instanceof MultyxClientValue && typeof value != 'object') {
            return this.object[property].set(serverSet ? new EditWrapper(value) : value);
        }
        
        // Attempting to edit property not editable to client
        if(!allowed) {
            if(this.multyx.options.verbose) {
                console.error(`Attempting to set property that is not editable. Setting '${this.propertyPath.join('.') + '.' + property}' to ${value}`);
            }
            return false;
        }

        // Creating a new value
        this.object[property] = new (MultyxClientItemRouter(value))(
            this.multyx,
            serverSet ? new EditWrapper(value) : value,
            [...this.propertyPath, property],
            this.editable
        );

        const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + property);
        if(this.multyx.events.has(propSymbol)) {
            this.multyx[Done].push(...this.multyx.events.get(propSymbol).map(e =>
                () => e(this.object[property])
            ));
        }

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
     * Wait for a specific property to be set
     * @param property Property to wait for
     * @returns Promise that resolves when the value is set
     */
    await(property: string) {
        if(this.has(property)) return Promise.resolve(this.get(property));
        const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + property);
        return new Promise(res => this.multyx.on(propSymbol, res));
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