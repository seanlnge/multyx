import type { Agent } from "../agents";

import { RawObject, Value } from "../types";

import MultyxObject from "./object";
import { MultyxItem } from ".";
import { EditWrapper } from "../utils/native";

export default class MultyxList extends MultyxObject {
    length: number;

    allowItemChange: boolean;
    allowItemAddition: boolean;
    allowItemDeletion: boolean;

    get value() {
        const parsed: any[] = [];
        for(let i=0; i<this.length; i++) parsed[i] = this.get(i)?.value;
        return parsed;
    }

    /**
     * Create a MultyxItem representation of an array
     * @param list Array to turn into MultyxObject
     * @param agent Client or MultyxTeam hosting this MultyxItem
     * @param propertyPath Entire path from agent to this MultyxList
     * @returns MultyxList
     */
    constructor(list: (RawObject | Value | MultyxItem)[], agent: Agent, propertyPath: string[] = [agent.uuid]) {
        super({}, agent, propertyPath);

        this.length = 0;
        this.allowItemAddition = true;
        this.allowItemChange = true;
        this.allowItemDeletion = true;

        this.push(...list);

        return new Proxy(this, {
            // Allow users to access properties in MultyxObject without using get
            get: (o, p: any) => {
                if(p in o) return o[p];
                return o.get(p) as MultyxItem; 
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
                return !!o.delete(p);
            }
        });
    }

    /**
     * Get the ClientValue object of a property
     */
    get(index: string | number) {
        if(typeof index == 'number') index = index.toString();
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
    set(index: string | number, value: any): this | false {
        if(typeof index == 'string') index = parseInt(index);
        if(!Number.isInteger(index)) return false;

        if(value instanceof EditWrapper) {
            if(!super.has(index.toString())) {
                if(this.disabled) return false;
            }

            if(value.value === undefined && !this.allowItemDeletion) return false;
            if(!this.allowItemAddition && index >= this.length) return false;
            if(!this.allowItemChange && index < this.length) return false;
            value = value.value;
        }
        
        // Deleting an element by setting MultyxList[index] = undefined
        if(value === undefined) return this.delete(index);

        // See if MultyxItem allows setting value
        const result = super.set(index.toString(), value);
        if(result) {
            if(index >= this.length) this.length = index+1;
            const item = this.get(index);
            this.data[index] = item;
        }
        return result ? this : false;
    }

    delete(index: number | string): this {
        super.delete(index.toString());
        this.length = this.reduce((a, c, i) => c !== undefined ? i+1 : a, 0);
        return this;
    }

    push(...items: any[]) {
        for(const item of items) {
            this.set(this.length, item);
        }
        return this.length;
    }

    pop(): MultyxItem | undefined {
        const result = this.get(this.length);
        this.delete(this.length);
        return result;
    }

    unshift(...items: any[]) {
        for(let i=this.length-1; i>=0; i--) {
            if(i >= items.length) this.set(i, this.get(i-items.length));
            else this.set(i, items[i]);
        }

        return this.length;
    }

    shift() {
        if(this.length == 0) return undefined;
        const first = this.get(0);
        for(let i=0; i<this.length; i++) {
            this.set(i, this.get(i+1));
        }
        return first;
    }

    splice(start: number, deleteCount?: number, ...items: any[]) {
        if(deleteCount === undefined) deleteCount = this.length - start;

        // Move elements in front of splice forward or backward
        let move = items.length - deleteCount;
        if(move > 0) {
            for(let i=this.length-1; i>=start + deleteCount; i--) {
                this.set(i + move, this.get(i));
            }
        } else if(move < 0) {
            for(let i=start+deleteCount; i<this.length; i++) {
                this.set(i + move, this.get(i));
            }

            // Delete elements past end of new list
            const ogLength = this.length;
            for(let i=ogLength+move; i<ogLength; i++) this.delete(i);
        }

        // Insert new elements starting at start
        for(let i=start; i<items.length; i++) this.set(i, items[i]);
    }

    slice(start?: number, end?: number) {
        if(start === undefined) return this;
        if(start < -this.length) start = 0;
        if(start < 0) start += this.length;

        if(end === undefined || end >= this.length) end = this.length;
        if(end < -this.length) end = 0;
        if(end < 0) end += this.length;
        
        if(start !== 0) {
            for(let i=0; i<end-start; i++) {
                this.set(i, this.get(i + start));
            }
        }

        for(let j=this.length-1; j>=end-start; j--) {
            this.delete(j);
        }

        return this;
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
    
    /* Native methods to allow MultyxList to be treated as primitive */
    [Symbol.iterator](): Iterator<MultyxItem> {
        const values = [];
        for(let i=0; i<this.length; i++) values[i] = this.get(i);
        return values[Symbol.iterator]();
    }
    toString = () => this.value.toString();
    valueOf = () => this.value;
    [Symbol.toPrimitive] = () => this.value;
}