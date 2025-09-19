import type { Agent, MultyxTeam } from "../agents";

import { RawObject, Value } from "../types";

import { IsMultyxItem, MultyxItem, MultyxValue } from ".";
import { Build, Edit, EditWrapper, Get, Self } from "../utils/native";
import MultyxItemRouter from "./router";

export default class MultyxList<T = any> {
    data: MultyxItem[];
    propertyPath: string[];
    agent: Agent;
    disabled: boolean;
    relayed: boolean;

    allowItemChange: boolean;
    allowItemAddition: boolean;
    allowItemDeletion: boolean;

    private publicTeams: Set<MultyxTeam>;
    private writeCallbacks: ((property: string, value: any, previousValue: any) => void)[] = [];

    [key: string]: any;

    get value() {
        return this.data.map((i: MultyxItem): any => i.value);
    }

    get relayedValue() {
        if(!this.relayed) return [];
        return this.data.map((i: MultyxItem): any => i.relayedValue);
    }

    get length() {
        return this.data.length;
    }

    set length(length: number) {
        for(let i=length; i<this.data.length; i++) {
            this.delete(i);
        }
    }

    private sendShiftOperation(index: number, move: number) {
        if(!this.relayed) return;

        if(index > 0) {
            for(let i=index; i<this.length; i++) {
                this.data[i][Self]([...this.propertyPath, (i+move).toString()], false);
            }
        }

        new MultyxValue(move, this.agent, [...this.propertyPath, 'shift', index.toString()]);
    }

    /**
     * Create a MultyxItem representation of an array
     * @param list Array to turn into MultyxObject
     * @param agent Client or MultyxTeam hosting this MultyxItem
     * @param propertyPath Entire path from agent to this MultyxList
     * @returns MultyxList
     */
    constructor(list: (RawObject | Value | MultyxItem)[], agent: Agent, propertyPath: string[] = [agent.uuid]) {
        this.data = [];
        this.propertyPath = propertyPath;
        this.agent = agent;
        this.disabled = false;
        this.relayed = true;
        this.publicTeams = new Set();

        this.allowItemAddition = true;
        this.allowItemChange = true;
        this.allowItemDeletion = true;

        if(list instanceof MultyxList) list = list.value;

        for(const item of list) {
            this.data.push(new (MultyxItemRouter(item))(
                item,
                agent,
                [...propertyPath, this.data.length.toString()]
            ));
        }

        if(this.constructor !== MultyxList) return this;

        return new Proxy(this, {
            has: (o, p: any) => {
                if(typeof p === 'number') return o.has(p)
                return p in o;
            },

            // Allow users to access properties in MultyxObject without using get
            get: (o, p: any) => {
                if(p in o) return o[p];
                if(Number.isInteger(parseInt(p))) p = parseInt(p);
                return o.data[p];
            },
            
            // Allow users to set MultyxObject properties by client.self.a = b
            set: (o, p: any, v) => {
                if(p in o) {
                    o[p] = v;
                    return true;
                }
                return !!o.set(p, v);
            },
            
            // Allow users to delete MultyxObject properties by delete client.self.a;
            deleteProperty(o, p: string) {
                if(typeof p === 'number') return !!o.delete(p);
                return false;
            }
        });
    }

    disable() {
        this.disabled = true;
        this.data.forEach((i: MultyxItem) => i.disable());
        return this;
    }

    enable() {
        this.disabled = false;
        this.data.forEach((i: MultyxItem) => i.enable());
        return this;
    }

    relay() {
        this.relayed = true;
        this.data.forEach((i: MultyxItem) => i.relay());
        return this;
    }

    unrelay() {
        this.relayed = false;
        this.data.forEach((i: MultyxItem) => i.unrelay());
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

    has(index: number) {
        return index >= 0 && index < this.data.length;
    }

    /**
     * Get the value of a property
     */
    get(property: number | string[]): MultyxItem | undefined {
        if(typeof property === 'number') return this.data[property];
        if(property.length == 0) return this;
        if(property.length == 1) return this.data[parseInt(property[0])];

        const next = this.data[parseInt(property[0])];
        if(!next || (next instanceof MultyxValue)) return undefined;
        return next.get(property.slice(1));
    }

    /**
     * Set the value of the MultyxValue object of a property
     * @example
     * ```js
     * // Server
     * multyx.on('reset', client => client.player.set('x', 5));
     * 
     * // Client
     * client.position[1] = 20 * Math.random();
     * multyx.send('reset');
     * console.log(client.position[1]); // 5
     * ```
     */
    set(index: string | number, value: any): this | false {
        if(typeof index === 'string') index = parseInt(index);
        if(!Number.isInteger(index)) return false;

        if(value instanceof EditWrapper) {
            if(!this.has(index) && this.disabled) return false;
            if(value.value === undefined && !this.allowItemDeletion) return false;
            if(!this.allowItemAddition && index >= this.length) return false;
            if(!this.allowItemChange && index < this.length) return false;
            value = value.value;
        } else if(IsMultyxItem(value)) {
            value = value.value;
        }
        
        // Deleting an element by setting MultyxList[index] = undefined
        if(value === undefined) return this.delete(index);
    
        const propertyPath = [...this.propertyPath, index.toString()];

        if(IsMultyxItem(value)) {
            value[Self](propertyPath);
            this.data[index] = value;
        } else {
            this.data[index] = new (MultyxItemRouter(value))(
                value,
                this.agent,
                propertyPath
            );
        }
        
        this.data[index].disabled = this.disabled;
        this.data[index].relayed = this.relayed;

        const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + index);
        if(this.agent.server?.events.has(propSymbol)) {
            this.agent.server?.events.get(propSymbol)!.forEach(event =>
                event.call(undefined, this.data[index])
            );
        }

        return this;
    }

    delete(index: string | number): this {
        if(typeof index === 'string') index = parseInt(index);
        delete this.data[index];
        if(index == this.length-1) this.length = index;

        new MultyxValue<undefined>(
            undefined,
            this.agent,
            [...this.propertyPath, index.toString()]
        );

        return this;
    }

    await(index: number) {
        if(this.has(index)) return Promise.resolve(this.get(index));
        const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + index);
        return new Promise(res => this.agent.server?.on(propSymbol, (_, v) => res(v)));
    }

    /**
     * Create a callback that gets called whenever the object is edited
     * @param index Index to listen for writes on
     * @param callback Function to call whenever object is edited
     * @returns Event object representing write callback
     */
    onWrite(index: number, callback: (v: any) => void) {
        const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + "." + index.toString());
        return this.agent.server.on(propSymbol, (_, v) => callback(v));
    }

    /**
     * Get all properties in list publicized to specific team
     * @param team MultyxTeam to get public data for
     * @returns Raw object
     */
    [Get](team: MultyxTeam) {
        const parsed: RawObject = [];

        for(const item of this.data) {
            if(item instanceof MultyxValue) {
                if(item.isPublic(team)) {
                    parsed.push(item.value);
                } else {
                    parsed.push(undefined);
                }
            } else {
                if(!(Get in item)) {
                    parsed.push(undefined);
                } else {
                    parsed.push(item[Get](team));
                }
            }   
        }

        return parsed;
    }
    
    /**
     * Build a constraint table
     * @returns Constraint table
     */
    [Build]() {
        if(!this.relayed) return [];
        
        const obj: RawObject[] = [];
        for(const item of this.data) {
            if(!(Build in item)) continue;
            obj.push(item[Build]());
        }
        return obj;
    }

    [Self](newPath: string[]) {
        this.propertyPath = newPath;

        for(const index in this.data) {
            if(!(Self in this.data[index])) continue;
            this.data[index][Self]([...newPath, index]);
        }
    }

    push(...items: any[]) {
        this.data.push(...items.map((item, index) => new (MultyxItemRouter(item))(
            item,
            this.agent,
            [...this.propertyPath, (this.length+index).toString()]
        )));
        
        return this.length;
    }

    pop(): MultyxItem | undefined {
        if(this.length == 0) return undefined;
        this.sendShiftOperation(-1, -1); // Delete last item
        return this.data.pop();
    }

    unshift(...items: any[]) {
        // Let client know that all items getting shifted right # of items being added
        this.sendShiftOperation(0, items.length);

        // Add new items
        this.data.unshift(...items.map((item, index) => new (MultyxItemRouter(item))(
            item,
            this.agent,
            [...this.propertyPath, (index).toString()]
        )));

        return this.length;
    }

    shift() {
        if(this.length == 0) return undefined;
        this.sendShiftOperation(1, -1);
        return this.data.shift();
    }

    splice(start: number, deleteCount?: number, ...items: any[]) {
        // If no delete count, delete all items from start to end
        if(deleteCount === undefined) deleteCount = this.length - start;

        // Calculate how much to shift items
        const move = items.length - deleteCount;

        // If items on the right are getting shifted, send a shift operation
        if(start + deleteCount < this.length && move != 0) {
            this.sendShiftOperation(start+deleteCount, move);
        }

        // Delete items not affected by replacement/shift
        if(move !== 0) this.sendShiftOperation(-1, move);

        // Add new items
        this.data.splice(
            start,
            deleteCount,
            ...items.map((item, index) => new (MultyxItemRouter(item))(
                item,
                this.agent,
                [...this.propertyPath, (start+index).toString()]
            ))
        );
        return this;
    }

    slice(start?: number, end?: number) {
        if(start === undefined) return this;
        if(start < -this.length) start = 0;
        if(start < 0) start += this.length;

        if(end === undefined || end >= this.length) end = this.length;
        if(end < -this.length) end = 0;
        if(end < 0) end += this.length;

        // Let client know that all items from start to end are getting shifted left
        this.sendShiftOperation(start, -start);

        // Shift all items in MultyxList
        for(let i=start; i<end; i++) {
            this.data[i-start] = this.data[i];
        }

        // Delete old items
        for(let i=this.length-1; i>=end-start; i--) {
            this.delete(i);
        }

        return this;
    }

    filter(predicate: (value: any, index: number, array: MultyxList) => boolean) {
        const keep = [];
        for(let i=0; i<this.length; i++) {
            keep.push(predicate(this.get(i), i, this));
        }

        let newLength = 0;
        let currentShiftLeft = 0;

        for(let i=this.length-1; i>=0; i--) {
            if(!keep[i]) {
                currentShiftLeft++;
            } else {
                newLength++;
                if(currentShiftLeft) {
                    this.sendShiftOperation(i, -currentShiftLeft);
                    currentShiftLeft = 0;
                }
            }
        }

        let offset = 0;
        for(let i=0; i<this.length; i++) {
            if(keep[i]) {
                this.data[i-offset] = this.data[i];
            } else {
                offset++;
            }
        }

        this.length = newLength;
        return this;
    }

    map(callbackfn: (value: any, index: number, array: MultyxList) => any) {
        for(let i=0; i<this.length; i++) {
            this.set(i, callbackfn(this.get(i), i, this));
        }
    }

    flat() {
        for(let i=0; i<this.length; i++) {
            const item = this.get(i);

            if(item instanceof MultyxList) {
                for(let j=0; j<item.length; j++) {
                    i++;
                    this.set(i, item[j]);
                }
            }
        }
    }

    reduce(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxList) => any, startingAccumulator: any) {
        for(let i=0; i<this.length; i++) {
            startingAccumulator = callbackfn(startingAccumulator, this.get(i), i, this);
        }
        return startingAccumulator;
    }

    reduceRight(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxList) => any, startingAccumulator: any) {
        for(let i=this.length-1; i>=0; i--) {
            startingAccumulator = callbackfn(startingAccumulator, this.get(i), i, this);
        }
        return startingAccumulator;
    }

    reverse() {
        this.data.reverse();
        this.sendShiftOperation(-1, 0);
        return this;
    }

    forEach(callbackfn: (value: any, index: number, array: MultyxList) => void) {
        for(let i=0; i<this.length; i++) {
            callbackfn(this.get(i), i, this);
        }
    }

    every(predicate: (value: any, index: number, array: MultyxList) => boolean) {
        for(let i=0; i<this.length; i++) {
            if(!predicate(this.get(i), i, this)) return false;
        }
        return true;
    }

    some(predicate: (value: any, index: number, array: MultyxList) => boolean) {
        for(let i=0; i<this.length; i++) {
            if(predicate(this.get(i), i, this)) return true;
        }
        return false;
    }

    find(predicate: (value: any, index: number, array: MultyxList) => boolean) {
        for(let i=0; i<this.length; i++) {
            if(predicate(this.get(i), i, this)) return this.get(i);
        }
        return undefined;
    }
    
    findIndex(predicate: (value: any, index: number, array: MultyxList) => boolean) {
        for(let i=0; i<this.length; i++) {
            if(predicate(this.get(i), i, this)) return i;
        }
        return -1;
    }

    entries(): [any, any][] {
        const entryList: [number, any][] = [];
        for(let i=0; i<this.length; i++) {
            entryList.push([i, this.get(i)]);
        }
        return entryList;
    }

    keys(): any[] {
        return Array(this.length).fill(0).map((_, i) => i);
    }

    values(): any[] {
        return Array(this.length).fill(0).map((_, i) => this.get(i));
    }
    
    /* Native methods to allow MultyxList to be treated as primitive */
    [Symbol.iterator](): Iterator<MultyxItem> {
        const values = [];
        for(let i=0; i<this.length; i++) {
            const item = this.get(i);
            if(item) values[i] = item;
        }
        return values[Symbol.iterator]();
    }
    toString = () => this.value.toString();
    valueOf = () => this.value;
    [Symbol.toPrimitive] = () => this.value;
}