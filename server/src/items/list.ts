import type { Client } from "../agents/client";
import type { MultyxTeam } from "../agents/team";

import { RawObject, Value } from "../types";

import MultyxValue from "./value";
import MultyxObject from "./object";
import { MultyxItem } from ".";

export default class MultyxList extends MultyxObject {
    length: number;

    allowItemChange: boolean;
    allowItemAddition: boolean;
    allowItemDeletion: boolean;

    private _raw: any[];
    public get raw(): any[] {
        return this._raw;
    }
    private set raw(value: any[]) {
        this._raw = value;
    }

    constructor(list: (RawObject | Value | MultyxObject)[], agent: Client | MultyxTeam, propertyPath: string[] = [agent.uuid]) {
        super({}, agent, propertyPath);

        this.length = 0;
        this.allowItemAddition = true;
        this.allowItemChange = true;
        this.allowItemDeletion = true;
        this.raw = [];

        this.push(...list);

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

    /**
     * Get the ClientValue object of a property
     */
    get(index: string | number) {
        index = index.toString();
        return this.data[index];
    }

    /**
     * Set the value of the MultyxValue object of a property
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
    set(index: number | string, value: Value | RawObject | MultyxObject): this | false {
        if(this.disabled) return false;
        if(this.shapeDisabled) return false;
        index = typeof index == 'string' ? parseInt(index) : index;
        
        // Deleting an element by setting MultyxList[index] = undefined
        if(value === undefined) {
            if(!this.allowItemDeletion) return false;
            if(index == this.length - 1) this.length--;
            const result = super.delete(index.toString());
            if(result) this.raw.splice(index, 1);
            return result;
        }

        if(!this.allowItemAddition && index >= this.length) return false;
        if(!this.allowItemChange && index < this.length) return false;

        // See if MultyxValue allows setting value
        const result = super.set(index.toString(), value);
        if(result) {
            this.length = Math.max(index+1, this.length);
            const item = this.get(index);
            this.raw[index] = item instanceof MultyxValue ? item.value : item.raw
        }
        return result ? this : false;
    }

    push(...items: any) {
        for(const item of items) {
            this.set(this.length, item);
        }
        return this.length;
    }

    pop(): MultyxObject | MultyxValue | null {
        if(this.disabled) return null;
        if(this.shapeDisabled) return null;
        this.length--;
        this.raw.pop();
        const result = this.get(this.length);
        this.delete(this.length.toString());
        return result;
    }

    unshift(...items: any[]) {
        this.length += items.length;

        for(let i=this.length-1; i>=0; i--) {
            if(i >= items.length) this.set(i, this.get(i-items.length));
            else this.set(i, items[i]);
        }

        return this.length;
    }

    shift() {
        if(this.length == 0) return undefined;
        this.length--;
        const first = this.get("0");
        for(let i=0; i<this.length; i++) {
            this.set(i, this.get(i+1));
        }
        return first;
    }

    filter(predicate: (value: any, index: number, array: MultyxList) => boolean) {
        const keep = [];
        for(let i=0; i<this.length; i++) {
            keep.push(predicate(this.get(i), i, this));
        }

        let negativeOffset = 0;
        for(let i=0; i<keep.length; i++) {
            if(keep[i] && negativeOffset) this.set(i - negativeOffset, this.get(i));
            if(!keep[i]) negativeOffset--;
        }
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
                this.set(i, item.raw[0]);
                for(const child of item.raw.slice(1)) {
                    this.length++;
                    i++;
                    this.set(i, child);
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
        let right = this.length-1;
        for(let left=0; left<right; left++) {
            const a = this.get(left);
            const b = this.get(right);
            this.set(left, b);
            this.set(right, a);
        }
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

    entries(): [any, number][] {
        const entryList: [any, number][] = [];
        for(let i=0; i<this.length; i++) {
            entryList.push([this.get(i), i]);
        }
        return entryList;
    }

    keys(): number[] {
        return Array(this.length).fill(0).map((_, i) => i);
    }
}