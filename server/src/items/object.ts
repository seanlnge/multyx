import MultyxValue from './value';
import MultyxItemRouter from './router';
import { MultyxItem, MultyxUndefined } from ".";

import { RawObject } from "../types";
import { Edit, Get, Value, EditWrapper, Build } from '../utils/native';

import type { Agent, MultyxTeam } from "../agents";

export default class MultyxObject {
    data: { [key: string]: MultyxItem };
    propertyPath: string[];
    agent: Agent;
    disabled: boolean;
    shapeDisabled: boolean;

    private publicTeams: Set<MultyxTeam>;

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
    constructor(object: RawObject | MultyxObject, agent: Agent, propertyPath: string[] = [agent.uuid]) {
        this.data = {};
        this.propertyPath = propertyPath;
        this.agent = agent;
        this.disabled = false;
        this.shapeDisabled = false;
        this.publicTeams = new Set();

        if(object instanceof MultyxObject) object = object.value;

        // Mirror object to be made of strictly MultyxItems
        for(const prop in object) {
            let child = object[prop];
            if(child instanceof MultyxObject || child instanceof MultyxValue) {
                child = child.value;
            }

            // MultyxItemRouter used to circumvent circular dependencies
            // Check /items/router.ts for extra information
            this.data[prop] = new (MultyxItemRouter(child))(
                child,
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

    /**
     * Publicize MultyxValue from specific MultyxTeam
     * @param team MultyxTeam to share MultyxValue to
     * @returns Same MultyxValue
     */
    addPublic(team: MultyxTeam) {
        if(this.publicTeams.has(team)) return this;

        this.publicTeams.add(team);
        for(const prop in this.data) this.data[prop].addPublic(team);

        return this;
    }

    /**
     * Privitize MultyxValue from specific MultyxTeam
     * @param team MultyxTeam to hide MultyxValue from
     * @returns Same MultyxValue
     */
    removePublic(team: MultyxTeam) {
        if(!this.publicTeams.has(team)) return this;

        this.publicTeams.delete(team);
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

        const propertyPath = [...this.propertyPath, property];

        // If value is a MultyxObject, don't create new object, change path
        if(value instanceof MultyxObject) {
            if(value instanceof EditWrapper && this.shapeDisabled) return false;

            value[Edit](propertyPath);
            this.data[property] = value;
        } else {
            if(value instanceof MultyxValue || value instanceof EditWrapper) {
                value = value.value;
            }

            this.data[property] = new (MultyxItemRouter(value))(
                value,
                this.agent,
                propertyPath
            );
        }

        this.data[property].disabled = this.disabled;

        // Propogate publicAgents to clients
        for(const team of this.publicTeams) {
            this.data[property].addPublic(team);
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
     * @param team MultyxTeam to get public data for
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
     * Build a constraint table
     * @returns Constraint table
     */
    [Build]() {
        const obj: RawObject = {};
        for(const prop in this.data) {
            const table = this.data[prop][Build]();
            if(Object.keys(table).length == 0) continue;
            obj[prop] = table;
        }
        return obj;
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
    }

    /* Native methods to allow MultyxObject to be treated as primitive */
    toString = () => this.value.toString();
    valueOf = () => this.value;
    [Symbol.toPrimitive] = () => this.value;
}