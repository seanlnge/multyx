import Multyx from '../';
import { MultyxClientItem } from '.';
import { EditWrapper } from '../utils';
import MultyxClientObject from "./object";

export default class MultyxClientList extends MultyxClientObject {
    length: number;

    get value() {
        const parsed: any[] = [];
        for(let i=0; i<this.length; i++) parsed[i] = this.get(i).value;
        return parsed;
    }

    constructor(multyx: Multyx, list: any[] | EditWrapper<any[]>, propertyPath: string[] = [], editable: boolean){
        super(multyx, {}, propertyPath, editable);

        this.length = 0;
        this.push(...(list instanceof EditWrapper ? list.value.map(x => new EditWrapper(x)) : list));

        return new Proxy(this, {
            has: (o, p) => {
                if(p in o) return true;
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
                return o.set(p as string, v);
            },
            deleteProperty: (o, p) => {
                return o.delete(p as string, false);
            }
        });
    }

    set(index: string | number, value: any) {
        if(typeof index == 'string') index = parseInt(index);
        if(value === undefined) return this.delete(index, false);
        if(value instanceof EditWrapper && value.value === undefined) return this.delete(index, true);

        const result = super.set(index, value);
        if(result && index >= this.length) this.length = index+1;
        
        return result;
    }

    delete(index: string | number, native: boolean = false) {
        if(typeof index == 'string') index = parseInt(index);

        const res = super.delete(index, native);
        if(res) this.length = this.reduce((a, c, i) => c !== undefined ? i+1 : a, 0);
        return res;
    }

    /**
     * Create a callback function that gets called for any current or future element in list
     * @param callbackfn Function to call for every element
     */
    forAll(callbackfn: (value: any, index: number) => void) {
        for(let i=0; i<this.length; i++) {
            callbackfn(this.get(i), i);
        }
        super.forAll((key, value) => callbackfn(value, key));
    }


    /* All general array methods */
    push(...items: any) {
        for(const item of items) this.set(this.length, item);
        return this.length;
    }
    
    pop(): MultyxClientItem | null {
        if(this.length === 0) return null;

        const res = this.get(this.length);
        this.delete(this.length);
        return res;
    }

    unshift(...items: any[]) {
        for(let i=this.length-1; i>=0; i--) {
            if(i >= items.length) {
                this.set(i, this.get(i-items.length));
            } else {
                this.set(i, items[i]);
            }
        }

        return this.length;
    }

    shift() {
        if(this.length == 0) return undefined;
        this.length--;

        const res = this.get(0);
        for(let i=0; i<this.length; i++) {
            this.set(i, this.get(i+1));
        }
        return res;
    }
    
    splice(start: number, deleteCount?: number, ...items: any[]) {
        if(deleteCount === undefined) {
            deleteCount = this.length - start;
        }

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
            const originalLength = this.length;
            for(let i=originalLength+move; i<originalLength; i++) {
                this.set(i, undefined);
            }
        }

        // Insert new elements starting at start
        for(let i=start; i<items.length; i++) {
            this.set(i, items[i]);
        }
    }

    
    filter(predicate: (value: any, index: number, array: MultyxClientList) => boolean) {
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

    map(callbackfn: (value: any, index: number, array: MultyxClientList) => any) {
        for(let i=0; i<this.length; i++) {
            this.set(i, callbackfn(this.get(i), i, this));
        }
    }

    flat() {
        for(let i=0; i<this.length; i++) {
            const item = this.get(i);

            if(item instanceof MultyxClientList) {
                for(let j=0; j<item.length; j++) {
                    i++;
                    this.set(i, item[j]);
                }
            }
        }
    }

    reduce(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxClientList) => any, startingAccumulator: any) {
        for(let i=0; i<this.length; i++) {
            startingAccumulator = callbackfn(startingAccumulator, this.get(i), i, this);
        }
        return startingAccumulator;
    }

    reduceRight(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxClientList) => any, startingAccumulator: any) {
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

    forEach(callbackfn: (value: any, index: number, array: MultyxClientList) => void) {
        for(let i=0; i<this.length; i++) {
            callbackfn(this.get(i), i, this);
        }
    }

    every(predicate: (value: any, index: number, array: MultyxClientList) => boolean) {
        for(let i=0; i<this.length; i++) {
            if(!predicate(this.get(i), i, this)) return false;
        }
        return true;
    }

    some(predicate: (value: any, index: number, array: MultyxClientList) => boolean) {
        for(let i=0; i<this.length; i++) {
            if(predicate(this.get(i), i, this)) return true;
        }
        return false;
    }

    find(predicate: (value: any, index: number, array: MultyxClientList) => boolean) {
        for(let i=0; i<this.length; i++) {
            if(predicate(this.get(i), i, this)) return this.get(i);
        }
        return undefined;
    }
    
    findIndex(predicate: (value: any, index: number, array: MultyxClientList) => boolean) {
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

    
    /* Native methods to allow MultyxClientList to be treated as array */
    [Symbol.iterator](): Iterator<MultyxClientItem> {
        const values = [];
        for(let i=0; i<this.length; i++) values[i] = this.get(i);
        return values[Symbol.iterator]();
    }
    toString = () => this.value.toString();
    valueOf = () => this.value;
    [Symbol.toPrimitive] = () => this.value;
}