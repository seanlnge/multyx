import MultyxValue from './value';
import MultyxItemRouter from './router';
import { MultyxItem, MultyxUndefined } from ".";

import { RawObject } from "../types";
import { Edit, Get, EditWrapper, Build, Self } from '../utils/native';

import type { Agent, MultyxTeam } from "../agents";

export default class MultyxObject {
    data: { [key: string]: MultyxItem };
    propertyPath: string[];
    agent: Agent;
    disabled: boolean;
    relayed: boolean;

    private publicTeams: Set<MultyxTeam>;

    // spent 2 hours tryna make this [key: Exclude<string, keyof MultyxObject>]: MultyxItem<any>
    // fuck you ryan cavanaugh https://github.com/microsoft/TypeScript/issues/17867
    [key: string]: any

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
     * Get the value of MultyxObject that is relayed to public agents
     * @returns RawObject mirroring shape and values of relayed MultyxObject
     */
    get relayedValue() {
        if(!this.relayed) return {};
        const parsed: RawObject = {};
        for(const p in this.data) {
            const m = this.data[p].relayedValue;
            if(m) parsed[p] = m;
        }
        return parsed;
    }

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
        this.relayed = true;
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
            has: (o, p: string) => {
                return o.has(p);
            },

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

    relay() {
        for(const prop in this.data) {
            this.data[prop].relay();
        }
        this.relayed = true;
        return this;
    }

    unrelay() {
        for(const prop in this.data) {
            this.data[prop].unrelay();
        }
        this.relayed = false;
        return this;
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
     * Get the value of a property
     */
    get(property: string | string[]): MultyxItem | undefined {
        if(typeof property === 'string') return this.data[property];
        if(property.length == 0) return this;
        if(property.length == 1) return this.data[property[0]];

        const next = this.data[property[0]];
        if(!next || (next instanceof MultyxValue)) return undefined;
        return next.get(property.slice(1));
    }

    /**
     * Set the explicit value of the property
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
        if(value instanceof EditWrapper && !this.has(property) && this.disabled) {
            return false;
        }

        // If just a normal value change, no need to update shape, can return
        if(typeof value !== "object" && this.data[property] instanceof MultyxValue
        || value instanceof EditWrapper && typeof value.value !== 'object') {
            return (this.data[property] as MultyxValue).set(
                value instanceof EditWrapper ? value.value : value
            ) ? this : false;
        }

        const propertyPath = [...this.propertyPath, property];

        // If value is a MultyxObject, don't create new object, change path
        if(value instanceof MultyxObject) {
            value[Self](propertyPath);
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
        this.data[property].relayed = this.relayed;

        // Propogate publicAgents to clients
        for(const team of this.publicTeams) {
            this.data[property].addPublic(team);
        }

        const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + property);
        if(this.agent.server?.events.has(propSymbol)) {
            this.agent.server?.events.get(propSymbol)!.forEach(event => {
                event.call(undefined, this.data[property]);
                if(event.saveHistory) event.delete(); // delete temp events
            });
        }
        return this;
    }

    /**
     * Delete property from MultyxObject
     * @param property Name of property to delete
     * @returns False if deletion failed, same MultyxObject otherwise
     */
    delete(property: string) {
        delete this.data[property];

        new MultyxUndefined(
            this.agent,
            [...this.propertyPath, property]
        );

        return this;
    }

    /**
     * Wait for a property in object to be defined
     * @param property Name of property in object to wait for 
     * @returns Promise that resolves once object[property] is defined
     */
    await(property: string) {
        if(this.has(property)) return Promise.resolve(this.get(property));
        const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + property);
        return new Promise(res => {
            const event = this.agent?.server?.on(propSymbol, () => res(this.get(property)));
            event.saveHistory = true; // so that caller knows to delete
        });
    }

    /**
     * Create a callback that gets called whenever the object is edited
     * @param callback Function to call whenever object is edited
     * @returns Event object representing write callback
     */
    onWrite(callback: (...args: any[]) => void) {
        const propSymbol = Symbol.for("_" + this.propertyPath.join('.'));
        return this.agent.server.on(propSymbol, callback);
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
        if(!this.relayed) return {};

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
    [Self](newPath: string[]) {
        this.propertyPath = newPath;

        for(const prop in this.data) {
            this.data[prop][Self]([...newPath, prop]);
        }
    }

    entries(): [string, any][] {
        return Object.entries(this.data);
    }

    keys(): string[] {
        return Object.keys(this.data);
    }

    values(): any[] {
        return Object.values(this.data);
    }

    /* Native methods to allow MultyxObject to be treated as primitive */
    toString = () => this.value.toString();
    valueOf = () => this.value;
    [Symbol.toPrimitive] = () => this.value;
}