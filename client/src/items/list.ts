import Multyx from '../';
import { IsMultyxClientItem, type MultyxClientItem, type MultyxClientObject, MultyxClientValue } from '.';
import { Add, Done, Edit, EditWrapper, Unpack } from '../utils';
import MultyxClientItemRouter from './router';
import { Message } from '../message';

export default class MultyxClientList {
    protected list: MultyxClientItem[];
    private multyx: Multyx;
    propertyPath: string[];
    editable: boolean;

    private editCallbacks: ((index: number, value: any, oldValue: any) => void)[] = [];

    addEditCallback(callback: (index: number, value: any, oldValue: any) => void) {
        this.editCallbacks.push(callback);
    }

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

    /**
     * Shifting operations are needed to ensure that operations on elements in
     * the list do not need to worry about the index of the element.
     * 
     * Instead of changing each element's value when shifting, these shift
     * operations are used to ensure that each MultyxClientItem stays the same
     * @param index Index to shift from, -1 if special operation
     * @param shift Shift amount, positive for right, negative for left
     */
    private handleShiftOperation(index: number, shift: number) {
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
                if(!isNaN(parseInt(p))) p = parseInt(p);
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

    get(index: number | string[]): MultyxClientItem {
        if(typeof index === 'number') return this.list[index];
        if(index.length == 0) return this;
        if(index.length == 1) return this.list[parseInt(index[0])];

        const item = this.list[parseInt(index[0])];
        if(!item || (item instanceof MultyxClientValue)) return undefined;
        return item.get(index.slice(1));
    }

    private recursiveSet(path: string[], value: any): boolean {
        if(path.length == 0) {
            if(this.multyx.options.verbose) {
                console.error(`Attempting to edit MultyxClientList with no path. Setting '${this.propertyPath.join('.')}' to ${value}`);
            }
            return false;
        }
        
        if(path[0] == "shift" && value instanceof EditWrapper) {
            this.handleShiftOperation(parseInt(path[1]), value.value);
            return true;
        }

        if(path.length == 1) return this.set(parseInt(path[0]), value);
        
        let next = this.get(parseInt(path[0]));
        if(next instanceof MultyxClientValue || next == undefined) {
            this.set(parseInt(path[0]), new EditWrapper({}));
            next = this.get(parseInt(path[0])) as MultyxClientObject;
        }
        return next.set(path.slice(1), value);
    }

    set(index: number | string[], value: any): boolean {
        if(Array.isArray(index)) return this.recursiveSet(index, value);

        const oldValue = this.get(index);

        const serverSet = value instanceof EditWrapper;
        const allowed = serverSet || this.editable;
        if(serverSet || IsMultyxClientItem(value)) value = value.value;
        if(value === undefined) return this.delete(index, serverSet);

        // If value is a MultyxClientValue, set the value
        if(this.list[index] instanceof MultyxClientValue && typeof value != 'object') {
            return this.list[index].set(serverSet ? new EditWrapper(value) : value);
        }
        
        // Attempting to edit property not editable to client
        if(!allowed) {
            if(this.multyx.options.verbose) {
                console.error(`Attempting to set property that is not editable. Setting '${this.propertyPath.join('.') + '.' + index}' to ${value}`);
            }
            return false;
        }
        
        this.list[index] = new (MultyxClientItemRouter(value))(
            this.multyx,
            serverSet ? new EditWrapper(value) : value,
            [...this.propertyPath, index.toString()],
            this.editable
        );

        const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + index);
        if(this.multyx.events.has(propSymbol)) {
            this.multyx[Done].push(...this.multyx.events.get(propSymbol).map(e =>
                () => e(this.list[index])
            ));
        }

        // We have to push into queue, since object may not be fully created
        // and there may still be more updates to parse
        for(const listener of this.editCallbacks) {
            this.multyx[Add](() => listener(index, this.get(index), oldValue));
        }
        
        return true;
    }

    delete(index: number, native: boolean = false) {
        const oldValue = this.get(index);

        if(typeof index == 'string') index = parseInt(index);

        if(!this.editable && !native) {
            if(this.multyx.options.verbose) {
                console.error(`Attempting to delete property that is not editable. Deleting '${this.propertyPath.join('.') + '.' + index}'`);
            }
            return false;
        }
        
        delete this.list[index];

        for(const listener of this.editCallbacks) {
            this.multyx[Add](() => listener(index, undefined, oldValue));
        }

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
     * Wait for a specific index to be set
     * @param index Index to wait for
     * @returns Promise that resolves when the value is set
     */
    await(index: number) {
        if(this.has(index)) return Promise.resolve(this.get(index));
        const propSymbol = Symbol.for("_" + this.propertyPath.join('.') + '.' + index);
        return new Promise(res => this.multyx.on(propSymbol, res));
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

    slice(start?: number, end?: number) {
        return this.list.slice(start, end);
    }

    splice(start: number, deleteCount?: number, ...items: any[]) {
        return this.list.splice(start, deleteCount, ...items);
    }
    
    setSplice(start: number, deleteCount?: number, ...items: any[]) {
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
        return this.list.filter((value, index) => predicate(value, index, this));
    }

    setFilter(predicate: (value: any, index: number, array: MultyxClientList) => boolean) {
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
        const mapped = [];
        for(let i=0; i<this.length; i++) {
            mapped.push(callbackfn(this.get(i), i, this));
        }
        return mapped;
    }

    flat() {
        return this.list.flat();
    }

    setFlat() {
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
            this.get(i)?.[Unpack](constraints[i]);
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