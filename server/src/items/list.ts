import type { Agent, MultyxTeam } from "../agents";
import { RawObject, Value } from "../types";
import type { MultyxItem } from ".";
import MultyxValue from "./value";
import { Build, Item, EditWrapper, Get, Self } from "../utils/native";
import MultyxItemRouter from "./router";

export default class MultyxList<T = any> {
    [Item] = "list";
    data: MultyxItem<T>[];
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
        return this.data.map((i: MultyxItem<T>): any => i.value);
    }

    get relayedValue() {
        if(!this.relayed) return [];
        return this.data.map((i: MultyxItem<T>): any => i.relayedValue);
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
    constructor(list: (RawObject | Value | MultyxItem<T>)[], agent: Agent, propertyPath: string[] = [agent.uuid]) {
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

        if(this.constructor !== MultyxList) return this as unknown as MultyxItem<T[]>;

        return new Proxy(this as MultyxList<T>, {
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
            set: (o, p: any, v: T | MultyxItem<T>) => {
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
        }) as MultyxItem<T[]>;
    }

    disable() {
        this.disabled = true;
        this.data.forEach((i: MultyxItem<T>) => i.disable());
        return this;
    }

    enable() {
        this.disabled = false;
        this.data.forEach((i: MultyxItem<T>) => i.enable());
        return this;
    }

    relay() {
        this.relayed = true;
        this.data.forEach((i: MultyxItem<T>) => i.relay());
        return this;
    }

    unrelay() {
        this.relayed = false;
        this.data.forEach((i: MultyxItem<T>) => i.unrelay());
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
        if(property.length == 0) return this as unknown as MultyxItem<T[]>;
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
        } else if(Item in value) {
            value = value.value;
        }
        
        // Deleting an element by setting MultyxList[index] = undefined
        if(value === undefined) return this.delete(index);
    
        const propertyPath = [...this.propertyPath, index.toString()];

        if(Item in value) {
            value[Self](propertyPath);
            this.data[index] = value as MultyxItem<T>;
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

    /**
     * Deletes an item from the MultyxList
     * @param index Index of item to delete
     * @returns Modified MultyxList
     */
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

    /**
     * Wait for a specific index to be set
     * @param index Index to wait for
     * @returns Promise that resolves when the value is set
     */
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

    /**
     * Appends all items to the end of the MultyxList
     * @param items Items to add to the end of the MultyxList
     * @returns New length of MultyxList
     */
    push(...items: any[]) {
        this.data.push(...items.map((item, index) => new (MultyxItemRouter(item))(
            item,
            this.agent,
            [...this.propertyPath, (this.length+index).toString()]
        )));
        
        return this.length;
    }

    /**
     * Removes and returns the last item in the MultyxList. If the list is empty, it returns undefined.
     * @returns Last item in MultyxList
     */
    pop(): MultyxItem<T> | undefined {
        if(this.length == 0) return undefined;
        this.sendShiftOperation(-1, -1); // Delete last item
        return this.data.pop();
    }

    /**
     * Adds one or more items to the beginning of the MultyxList and returns the new length of the list.
     * @param items Items to add to the beginning of the MultyxList
     * @returns New length of MultyxList
     */
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

    /**
     * Removes and returns the first item in the MultyxList. If the list is empty, it returns undefined.
     * @returns First item in MultyxList
     */
    shift() {
        if(this.length == 0) return undefined;
        this.sendShiftOperation(1, -1);
        return this.data.shift();
    }

    /**
     * Returns a new MultyxList with the elements changed by the splice.
     * @param start Start index
     * @param deleteCount Number of elements to delete
     * @param items Elements to add
     * @returns New MultyxList
     */
    toSpliced(start: number, deleteCount?: number, ...items: any[]) {
        if(!deleteCount) return this.data.splice(start);
        return this.data.splice(start, deleteCount, ...items);
    }

    /**
     * Changes the contents of the MultyxList by removing or replacing existing elements and/or adding new elements at the specified start index. The deleteCount parameter specifies the number of elements to remove. It shifts elements as needed to accommodate additions.
     * @param start Start index
     * @param deleteCount Number of elements to delete
     * @param items Elements to add
     * @returns Array of deleted elements
     */
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
        const newItems = items.map((item, index) => new (MultyxItemRouter(item))(
            item,
            this.agent,
            [...this.propertyPath, (start+index).toString()]
        )) as MultyxItem<T>[];

        this.data.splice(
            start,
            deleteCount,
            ...newItems
        );
        return newItems;
    }

    /**
     * Returns a new MultyxList with the elements changed by the slice.
     * @param start Start index
     * @param end End index
     * @returns New MultyxList
     */
    slice(start?: number, end?: number) {
        return this.data.slice(start, end) as MultyxItem<T>[];
    }

    /**
     * Turns MultyxList into a portion of the array ranging from indices `start` to `end` (`end` not included). This does not return a new MultyxList or a reference to a MultyxList, but modifies the original MultyxList.
     * @param start Start index
     * @param end End index
     * @returns Modified MultyxList
     */
    setSlice(start?: number, end?: number) {
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

    /**
     * Creates a new MultyxList containing only the elements that pass the test implemented by the provided predicate function.
     * @param predicate Predicate function to test each element
     * @returns New MultyxList
     */
    filter(predicate: (value: any, index: number, array: MultyxList) => boolean) {
        const filtered: MultyxItem<T>[] = [];
        for(let i=0; i<this.length; i++) {
            const item = this.get(i);
            if(predicate(item, i, this) && item) {
                filtered.push(item as MultyxItem<T>);
            }
        }
        return filtered;
    }

    /**
     * Filters the MultyxList by removing elements that do not pass the test implemented by the provided predicate function.
     * @param predicate Predicate function to test each element
     * @returns Modified MultyxList
     */
    setFilter(predicate: (value: any, index: number, array: MultyxList) => boolean) {
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

    /**
     * Transforms each element of the MultyxList using the provided callback function.
     * @param callbackfn Callback function to transform each element
     * @returns New MultyxList
     */
    map(callbackfn: (value: any, index: number, array: MultyxList) => any) {
        const next = [];
        for(let i=0; i<this.length; i++) {
            next.push(callbackfn(this.get(i), i, this));
        }
        return next;
    }

    /**
     * Transforms each element of the MultyxList using the provided callback function.
     * @param callbackfn Callback function to transform each element
     * @returns Modified MultyxList
     */
    setMap(callbackfn: (value: any, index: number, array: MultyxList) => any) {
        for(let i=0; i<this.length; i++) {
            this.set(i, callbackfn(this.get(i), i, this));
        }
        return this;
    }

    /**
     * Flattens nested MultyxList structures by one level, appending the elements of any nested lists to the main list.
     * @returns New MultyxList
     */
    flat() {
        return this.data.flat();
    }

    /**
     * Flattens nested MultyxList structures by one level, appending the elements of any nested lists to the main list.
     * @returns Modified MultyxList
     */
    setFlat() {
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

    /**
     * Applies a function against an accumulator and each element in the MultyxList (from left to right) to reduce it to a single value.
     * @param callbackfn Callback function to apply to each element
     * @param startingAccumulator Starting value for the accumulator
     * @returns Reduced value
     * @example
     * ```js
     * client.self.list = [1, 2, 3, 4, 5];
     * const sum = client.self.list.reduce((acc, curr) => acc + curr, 0);
     * console.log(sum); // 15
     * ```
     */
    reduce(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxList) => any, startingAccumulator: any) {
        for(let i=0; i<this.length; i++) {
            startingAccumulator = callbackfn(startingAccumulator, this.get(i), i, this);
        }
        return startingAccumulator;
    }

    /**
     * Applies a function against an accumulator and each element in the MultyxList (from right to left) to reduce it to a single value.
     * @param callbackfn Callback function to apply to each element
     * @param startingAccumulator Starting value for the accumulator
     * @returns Reduced value
     * @example
     * ```js
     * client.self.list = [1, 2, 3];
     * const sum = client.self.list.reduceRight((acc, curr) => curr - acc, 0);
     * console.log(sum); // 2 since 3-0 = 3, 2-3 = -1, 1-(-1) = 2
     * ```
     */
    reduceRight(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxList) => any, startingAccumulator: any) {
        for(let i=this.length-1; i>=0; i--) {
            startingAccumulator = callbackfn(startingAccumulator, this.get(i), i, this);
        }
        return startingAccumulator;
    }

    /**
     * Reverses the order of the elements in the MultyxList in place and returns same MultyxList.
     * @returns Modified MultyxList
     * @example
     * ```js
     * client.self.list = [1, 2, 3];
     * client.self.list.reverse();
     * console.log(client.self.list); // [3, 2, 1]
     */
    reverse() {
        this.data.reverse();
        this.sendShiftOperation(-1, 0);
        return this;
    }

    /**
     * Executes a provided function once for each MultyxList element.
     * @param callbackfn Callback function to execute for each element
     * @returns Modified MultyxList
     * @example
     * ```js
     * client.self.list = [1, 2, 3];
     * client.self.list.forEach((value, index) => {
     *   console.log(value, index);
     * });
     * ```
     */
    forEach(callbackfn: (value: any, index: number, array: MultyxList) => void) {
        for(let i=0; i<this.length; i++) {
            callbackfn(this.get(i), i, this);
        }
    }

    /**
     * Tests whether all elements in the MultyxList pass the test implemented by the provided predicate function.
     * @param predicate Predicate function to test each element
     * @returns True if all elements pass the test, false otherwise
     * @example
     * ```js
     * client.self.list = [1, 2, 3];
     * const allPositive = client.self.list.every((value) => value > 0);
     * console.log(allPositive); // true
     * ```
     */
    every(predicate: (value: any, index: number, array: MultyxList) => boolean) {
        for(let i=0; i<this.length; i++) {
            if(!predicate(this.get(i), i, this)) return false;
        }
        return true;
    }

    /**
     * Tests whether at least one element in the MultyxList passes the test implemented by the provided predicate function.
     * @param predicate Predicate function to test each element
     * @returns True if at least one element passes the test, false otherwise
     * @example
     * ```js
     * client.self.list = [1, 2, 3];
     * const hasNegative = client.self.list.some((value) => value < 0);
     * console.log(hasNegative); // false
     * ```
     */
    some(predicate: (value: any, index: number, array: MultyxList) => boolean) {
        for(let i=0; i<this.length; i++) {
            if(predicate(this.get(i), i, this)) return true;
        }
        return false;
    }

    /**
     * Returns the first element in the MultyxList that satisfies the provided predicate function.
     * @param predicate Predicate function to test each element
     * @returns The first element that passes the test, undefined if no element passes the test
     * @example
     * ```js
     * client.self.list = [1, 2, 3];
     * const firstEven = client.self.list.find((value) => value % 2 === 0);
     * console.log(firstEven); // 2
     * ```
     */
    find(predicate: (value: any, index: number, array: MultyxList) => boolean) {
        for(let i=0; i<this.length; i++) {
            if(predicate(this.get(i), i, this)) return this.get(i);
        }
        return undefined;
    }
    
    /**
     * Returns the index of the first element in the MultyxList that satisfies the provided predicate function.
     * @param predicate Predicate function to test each element
     * @returns The index of the first element that passes the test, -1 if no element passes the test
     * @example
     * ```js
     * client.self.list = [1, 2, 3];
     * const firstEvenIndex = client.self.list.findIndex((value) => value % 2 === 0);
     * console.log(firstEvenIndex); // 1
     * ```
     */
    findIndex(predicate: (value: any, index: number, array: MultyxList) => boolean) {
        for(let i=0; i<this.length; i++) {
            if(predicate(this.get(i), i, this)) return i;
        }
        return -1;
    }

    /**
     * Returns an array of [value, index] pairs for each element in the MultyxList.
     * @returns Array of [value, index] pairs
     * @example
     * ```js
     * client.self.list = [1, 2, 3];
     * const entries = client.self.list.entries();
     * console.log(entries); // [[0, 1], [1, 2], [2, 3]]
     * ```
     */
    entries(): [any, any][] {
        const entryList: [number, any][] = [];
        for(let i=0; i<this.length; i++) {
            entryList.push([i, this.get(i)]);
        }
        return entryList;
    }

    /**
     * Returns an array of the keys (indices) for each element in the MultyxList.
     * @returns Array of keys
     * @example
     * ```js
     * client.self.list = [1, 2, 3];
     * const keys = client.self.list.keys();
     * console.log(keys); // [0, 1, 2]
     * ```
     */
    keys(): any[] {
        return Array(this.length).fill(0).map((_, i) => i);
    }

    /**
     * Returns an array of the values for each element in the MultyxList.
     * @returns Array of values
     * @example
     * ```js
     * client.self.list = [1, 2, 3];
     * const values = client.self.list.values();
     * console.log(values); // [1, 2, 3]
     * ```
     */
    values(): any[] {
        return Array(this.length).fill(0).map((_, i) => this.get(i));
    }
    
    /* Native methods to allow MultyxList to be treated as primitive */
    [Symbol.iterator](): Iterator<MultyxItem<T>> {
        const values = [];
        for(let i=0; i<this.length; i++) {
            const item = this.get(i);
            if(item) values[i] = item;
        }
        return values[Symbol.iterator]() as Iterator<MultyxItem<T>>;
    }
    toString = () => this.value.toString();
    valueOf = () => this.value;
    [Symbol.toPrimitive] = () => this.value;
}