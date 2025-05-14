import Multyx from '../';
import { IsMultyxClientItem, MultyxClientItem, MultyxClientValue } from '.';
import { Add, Edit, EditWrapper, Unpack } from '../utils';
import MultyxClientItemRouter from './router';
import { Message } from '../message';

export default class MultyxClientList {
    protected list: MultyxClientItem[];
    private multyx: Multyx;
    propertyPath: string[];
    editable: boolean;

    private setterListeners: ((key: any, value: any) => void)[];

    get value() {
        const parsed: any[] = [];
        for(let i=0; i<this.length; i++) parsed[i] = this.get(i)?.value;
        return parsed;
    }

    get length() {
        return this.list.length;
    }

    set length(length: number) {
        this.list.length = length;
    }

    [Edit](updatePath: string[], value: any) {
        const index = parseInt(updatePath[0]);
        if(isNaN(index) && updatePath[0] != "shift") {
            if(this.multyx.options.verbose) {
                console.error("Update path is not a number. Attempting to edit MultyxClientList with non-number index.");
            }
            return;
        }

        if(updatePath.length == 1) {
            this.set(index, new EditWrapper(value));
            return;
        }
        
        if(updatePath[0] == "shift") {
            this.handleShiftOperation(parseInt(updatePath[1]), value);
            return;
        }
        
        if(updatePath.length == 0 && this.multyx.options.verbose) {
            console.error("Update path is empty. Attempting to edit MultyxClientList with no path.");
        }

        if(!this.has(index)) {
            this.set(index, new EditWrapper({}));
        }
        this.get(index)[Edit](updatePath.slice(1), value);
    }

    /**
     * Shifting operations are needed to ensure that operations on elements in
     * the list do not need to worry about the index of the element.
     * 
     * Instead of changing each element's value when shifting, these shift
     * operations are used to ensure that each MultyxClientItem stays the same
     * @param index Index to shift from, -1 if special operation
     * @param shift Shift amount, positive for right, negative for left
     */
    private handleShiftOperation(index: number, shift: any) {
        const operation = index >= 0
            ? shift >= 0 ? 'right': 'left'
            : shift == 0 ? 'reverse' : shift < 0 ? 'length' : 'unknown';
        
        switch(operation) {
            // Reverse the array
            case 'reverse':
                for(let i=0; i<Math.floor(this.length/2); i++) {
                    const temp = this.list[i];
                    this.list[i] = this.list[this.length-1-i];
                    this.list[this.length-1-i] = temp;
                }
                break;

            // Shift items to the left
            case 'left':    
                for(let i=index; i<this.length; i++) {
                    if(i+shift < 0) continue;
                    this.list[i+shift] = this.list[i];
                }
                break;
            
            // Shift items to the right
            case 'right':
                for(let i=this.length-1; i>=index; i--) {
                    this.list[i+shift] = this.list[i];
                }
                break;

            // Alter the length of the array
            case 'length':
                this.length += shift;
                break;

            // Unknown operation
            default:
                if(this.multyx.options.verbose) {
                    console.error("Unknown shift operation: " + operation);
                }
        }
    }

    constructor(multyx: Multyx, list: any[] | EditWrapper<any[]>, propertyPath: string[] = [], editable: boolean){
        this.list = [];
        this.propertyPath = propertyPath;
        this.multyx = multyx;
        this.editable = editable;

        this.setterListeners = [];

        const isEditWrapper = list instanceof EditWrapper;
        if(list instanceof MultyxClientList) list = list.value;
        if(list instanceof EditWrapper) list = list.value;

        for(let i=0; i<list.length; i++) {
            this.set(i, isEditWrapper
                ? new EditWrapper(list[i])
                : list[i]
            );
        }

        return new Proxy(this, {
            has: (o, p: any) => {
                if(typeof p == 'number') return o.has(p);
                return p in o;
            },
            get: (o, p: any) => {
                if(p in o) return o[p];
                return o.get(p) as MultyxClientItem;
            },
            set: (o, p: any, v) => {
                if(p in o) {
                    o[p] = v;
                    return true;
                }
                return !!o.set(p, v);
            },
            deleteProperty: (o, p: any) => {
                if(typeof p == 'number') return o.delete(p);
                return false;
            }
        });
    }

    has(index: number): boolean {
        return index >= 0 && index < this.length;
    }

    get(index: number): MultyxClientItem {
        return this.list[index];
    }

    set(index: number, value: any): boolean {
        if(value === undefined) return this.delete(index, false);

        // If value was deleted by the server
        if(value instanceof EditWrapper && value.value === undefined) return this.delete(index, true);

        // If value is a MultyxClientValue, set the value
        if(this.list[index] instanceof MultyxClientValue && !IsMultyxClientItem(value)) return this.list[index].set(value);
        
        // Attempting to edit property not editable to client
        if(!(value instanceof EditWrapper) && !this.editable) {
            if(this.multyx.options.verbose) {
                console.error(`Attempting to set property that is not editable. Setting '${this.propertyPath.join('.') + '.' + index}' to ${value}`);
            }
            return false;
        }
        
        this.list[index] = new (MultyxClientItemRouter(
            value instanceof EditWrapper ? value.value : value
        ))(this.multyx, value, [...this.propertyPath, index.toString()], this.editable);

        // We have to push into queue, since object may not be fully created
        // and there may still be more updates to parse
        for(const listener of this.setterListeners) {
            this.multyx[Add](() => {
                if(this.has(index)) listener(index, this.get(index));
            });
        }
        
        if(!(value instanceof EditWrapper)) this.multyx.ws.send(Message.Native({
            instruction: 'edit',
            path: [...this.propertyPath, index.toString()],
            value: this.list[index].value
        }));

        if(index >= this.length) this.length = index+1;
        
        return true;
    }

    delete(index: number, native: boolean = false) {
        if(typeof index == 'string') index = parseInt(index);

        if(!this.editable && !native) {
            if(this.multyx.options.verbose) {
                console.error(`Attempting to delete property that is not editable. Deleting '${this.propertyPath.join('.') + '.' + index}'`);
            }
            return false;
        }
        
        delete this.list[index];

        if(!native) {
            this.multyx.ws.send(Message.Native({
                instruction: 'edit',
                path: [...this.propertyPath, index.toString()],
                value: undefined
            }));
        }

        return true;
    }

    /**
     * Create a callback function that gets called for any current or future element in list
     * @param callbackfn Function to call for every element
     */
    forAll(callbackfn: (value: any, index: number) => void) {
        for(let i=0; i<this.length; i++) {
            callbackfn(this.get(i), i);
        }
        this.setterListeners.push(callbackfn);
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

    [Unpack](constraints: any[]) {
        for(let i=0; i<this.length; i++) {
            this.get(i)[Unpack](constraints[i]);
        }
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