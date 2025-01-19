import type { Client } from "../agents/client";
import type { MultyxTeam } from "../agents/team";

import MultyxValue from './value';
import MultyxItemRouter from './router';
import { MultyxItem, MultyxUndefined } from ".";

import { RawObject } from "../types";
import { Edit, Get, Value } from "../utils/native";

export default class MultyxObject {
    data: { [key: string]: MultyxItem };
    propertyPath: string[];
    agent: Client | MultyxTeam;
    disabled: boolean;
    shapeDisabled: boolean;

    // spent 2 hours tryna make this [key: Exclude<string, keyof MultyxObject>]: MultyxItem<any>
    // fuck you ryan cavanaugh https://github.com/microsoft/TypeScript/issues/17867
    [key: string]: any

    /**
     * Create a MultyxItem representation of an object
     * @param object Object to turn into MultyxItem
     * @param agent Client or MultyxTeam hosting this MultyxItem
     * @param propertyPath Entire path from agent to this MultyxObject
     * @returns MultyxObject
     */
    constructor(object: RawObject, agent: Client | MultyxTeam, propertyPath: string[] = [agent.uuid]) {
        this.data = {};
        this.propertyPath = propertyPath;
        this.agent = agent;
        this.disabled = false;
        this.shapeDisabled = false;

        // Mirror object to be made of strictly MultyxItems
        for(const prop in object) {
            // MultyxItemRouter used to circumvent circular dependencies
            // Check /items/router.ts for extra information
            this.data[prop] = new (MultyxItemRouter(object[prop]))(
                object[prop],
                agent,
                [...propertyPath, prop]
            );
        }

        // Apply proxy inside other constructor rather than here
        if(this.constructor !== MultyxObject) return this;

        return new Proxy(this, {
            // Allow users to access properties in MultyxObject without using get
            get: (o, p: string) => {
                if(p in o) return o[p];
                return o.get(p) as MultyxItem<any>; 
            },
            
            // Allow users to set MultyxObject properties by client.self.a = b
            set: (o, p: string, v) => {
                if(p in o) {
                    o[p] = v;
                    return true;
                }
                return !!o.set(p, v);
            },

            // Allow users to delete MultyxObject properties by delete client.self.a;
            deleteProperty(o, p: string) {
                return !!o.delete(p);
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

    addPublic(team: MultyxTeam) {
        for(const prop in this.data) this.data[prop].addPublic(team);
        return this;
    }

    removePublic(team: MultyxTeam) {
        for(const prop in this.data) this.data[prop].removePublic(team);
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
     * multyx.on('reset', client => client.player.set('x', 5));
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
            return (this.data[property] as MultyxValue).set(value) ? this : false;
        }

        if(this.shapeDisabled) return false;
        const propertyPath = [...this.propertyPath, property];

        if(value instanceof MultyxObject) {
            value[Edit](propertyPath);
            this.data[property] = value;
        } else {
            const trueValue = value instanceof MultyxValue ? value.value : value;

            this.data[property] = new (MultyxItemRouter(trueValue))(
                trueValue,
                this.agent,
                propertyPath
            );
        }

        return this;
    }

    /**
     * Delete property from MultyxObject
     * @param property Name of property to delete
     * @returns False if deletion failed, same MultyxObject otherwise
     */
    delete(property: string) {
        if(this.shapeDisabled) return false;
        delete this.data[property];

        new MultyxUndefined(
            this.agent,
            [...this.propertyPath, property]
        );

        return this;
    }

    /**
     * Turn MultyxObject back into regular object
     * @returns RawObject mirroring shape and values of MultyxObject
     */
    get value() {
        const parsed: RawObject = {};
        for(const p in this.data) parsed[p] = this.data[p].value;
        return parsed;
    }

    /**
     * Get all properties in object publicized to specific team
     * @param team Team get public data for
     * @returns Raw object
     */
    [Get](team: MultyxTeam): RawObject {
        const parsed: RawObject = {};
        
        for(const prop in this.data) {
            const m = this.data[prop];

            if(m instanceof MultyxValue) {
                if(m.isPublic(team)) parsed[prop] = m.value;
            } else {
                parsed[prop] = m[Get];
            }
        }

        return parsed;
    }

    /**
     * Edit the property path of MultyxObject and any children
     * @param newPath New property path to take
     */
    [Edit](newPath: string[]) {
        this.propertyPath = newPath;

        for(const prop in this.data) {
            this.data[prop][Edit]([...newPath, prop]);
        }
        const clients = new Set(this.agent.clients);
    }
}