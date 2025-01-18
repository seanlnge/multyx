import type { Client } from "../agents/client";
import type { MultyxTeam } from "../agents/team";

import MultyxValue from './value';
import MultyxItemRouter from './router';
import { MultyxItem } from ".";

import { RawObject } from "../types";

export default class MultyxObject {
    data: { [key: string]: MultyxItem };
    propertyPath: string[];
    agent: Client | MultyxTeam;
    disabled: boolean;
    shapeDisabled: boolean;

    // spent 2 hours tryna make this [key: Exclude<string, keyof MultyxObject>]: MultyxItem<any>
    // fuck you ryan cavanaugh https://github.com/microsoft/TypeScript/issues/17867
    [key: string]: any

    constructor(object: RawObject, agent: Client | MultyxTeam, propertyPath: string[] = [agent.uuid]) {
        this.data  = {};
        this.propertyPath = propertyPath;
        this.agent = agent;
        this.disabled = false;
        this.shapeDisabled = false;

        for(const prop in object) {
            this.data[prop] = new (MultyxItemRouter(object[prop]))(
                object[prop],
                agent,
                [...propertyPath, prop]
            );

            if(!(prop in this)) this[prop] = this.data[prop];   
        }

        // Apply proxy inside other constructor rather than here
        if(this.constructor !== MultyxObject) return this;

        return new Proxy(this, {
            // Allow clients to access properties in MultyxObject without using get
            get: (o, p: string) => {
                if(p in o) return o[p];
                return o.get(p) as MultyxItem<any>; 
            },
            
            // Allow clients to set MultyxObject properties by client.self.a = b
            set: (o, p: string, v) => {
                if(p in o) {
                    o[p] = v;
                    return true;
                }
                return !!o.set(p, v);
            }
        });
    }

    disable() {
        for(const prop in this.data) {
            this.data[prop].disable();
        }
        this.disabled = true;

        return this;
    }

    enable() {
        for(const prop in this.data) {
            this.data[prop].enable();
        }
        this.disabled = false;

        return this;
    }

    disableShape(recursive = false) {
        if(recursive) {
            for(const prop in this.data) {
                if(this.data[prop] instanceof MultyxObject) {
                    this.data[prop].shapeDisabled = true;
                }
            }
        }
        this.shapeDisabled = true;
    }

    enableShape(recursive = false) {
        if(recursive) {
            for(const prop in this.data) {
                if(this.data[prop] instanceof MultyxObject) {
                    this.data[prop].shapeDisabled = false;
                }
            }
        }
        this.shapeDisabled = false;
    }

    public(team: MultyxTeam) {
        for(const prop in this.data) {
            this.data[prop].public(team);
        }

        return this;
    }

    /**
     * Check if property is in object
     */
    has(property: string) {
        return property in this.data;
    }

    /**
     * Get the ClientValue object of a property
     */
    get(property: string) {
        return this.data[property];
    }

    /**
     * Set the explicit value of the ClientValue object of a property
     * @example
     * ```js
     * // Server
     * multyx.on('reset', client => client.player.setValue('x', 5));
     * 
     * // Client
     * client.player.x = 20 * Math.random();
     * multyx.send('reset');
     * console.log(client.player.x); // 5
     * ```
     */
    set(property: string, value: any): MultyxObject | false {
        // If just a normal value change, no need to update shape, can return
        if(typeof value !== "object" && this.data[property] instanceof MultyxValue) {
            const attempt = (this.data[property] as MultyxValue).set(value);
            return attempt ? this : false;
        }

        if(this.shapeDisabled) return false;
        const propertyPath = [...this.propertyPath, property];

        if(value instanceof MultyxObject) {
            this.data[property] = value;
            value.editPropertyPath(propertyPath);
        } else {
            this.data[property] = new (MultyxItemRouter(value))(
                value,
                this.agent,
                this.propertyPath
            );
        }

        const clients = new Set(this.agent.clients)
        this.agent.server?.editUpdate(this, clients);

        return this;
    }

    delete(property: string) {
        if(this.shapeDisabled) return false;

        delete this.data[property];
        const clients = new Set(this.agent.clients);
        this.agent.server?.editUpdate(this, clients);
        return this;
    }

    get raw() {
        const parsed: RawObject = {};
        
        for(const prop in this.data) {
            const m = this.data[prop];

            if(m instanceof MultyxValue) {
                parsed[prop] = m.value;
            } else {
                parsed[prop] = m.raw;
            }
        }

        return parsed;
    }

    getRawPublic(team: MultyxTeam): RawObject {
        const parsed: RawObject = {};
        
        for(const prop in this.data) {
            const m = this.data[prop];

            if(m instanceof MultyxValue) {
                if(m.isPublic(team)) parsed[prop] = m.value;
            } else {
                parsed[prop] = m.raw;
            }
        }

        return parsed;
    }

    _buildConstraintTable() {
        const table: RawObject = {};

        for(const prop in this.data) {
            table[prop] = this.data[prop]._buildConstraintTable();
        }

        return table;
    }

    editPropertyPath(newPath: string[]) {
        this.propertyPath = newPath;
        for(const prop in this.data) {
            if(this.data[prop] instanceof MultyxObject) {
                this.editPropertyPath([...this.propertyPath, prop]);
            } else {
                this.data[prop].propertyPath = [...this.propertyPath, prop];
            }
        }
    }
}