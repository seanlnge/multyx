import { Client, MultyxClients, MultyxTeam } from "./client";
import { RawObject, Value } from "./types";

export class MultyxObject {
    data: { [key: string]: MultyxObject | MultyxValue };
    propertyPath: string[];
    client: Client | MultyxTeam;
    disabled: boolean;

    constructor(object: RawObject, client: Client | MultyxTeam, propertyPath: string[] = []) {
        this.data  = {};
        this.propertyPath = propertyPath;
        this.client = client;
        this.disabled = false;
        
        for(const prop in object) {
            this.data[prop] = new (
                Array.isArray(object[prop]) ? MultyxList
                : typeof object[prop] == 'object' ? MultyxObject
                : MultyxValue
            )(object[prop], client, [...propertyPath, prop]);
        }
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

    public(team: MultyxTeam = MultyxClients) {
        for(const prop in this.data) {
            this.data[prop].public(team);
        }

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
    get(property: string): any {
        return this.data[property];
    }

    /**
     * Set the explicit value of the ClientValue object of a property
     * @example
     * ```js
     * // Server
     * multyx.on('reset', client => client.player.setValue('x', 5));
     * 
     * // Client
     * client.player.x = 20 * Math.random();
     * multyx.send('reset');
     * console.log(client.player.x); // 5
     * ```
     */
    set(property: string, value: any) {
        // If just a normal value change, no need to update shape, can return
        if(typeof value !== "object" && this.data[property] instanceof MultyxValue) {
            return (this.data[property] as MultyxValue).set(value);
        }

        const propertyPath = [...this.propertyPath, property];

        if(Array.isArray(value)) {
            this.data[property] = new MultyxList(
                value,
                this.client,
                propertyPath
            );
        } else if(typeof value !== "object") {
            this.data[property] = new MultyxValue(
                value,
                this.client,
                propertyPath
            );
        } else if(!(value instanceof MultyxObject)) {
            this.data[property] = new MultyxObject(
                value,
                this.client,
                propertyPath
            );
        } else {
            this.data[property] = value;
            value.editPropertyPath(propertyPath);
        }

        if(this.client instanceof MultyxTeam) {
            const clients = this.client instanceof MultyxTeam
                ? new Set(this.client.clients)
                : new Set([this.client]);
            this.client.server?.editUpdate(this, clients);
        }
        return this;
    }

    delete(property: string) {
        delete this.data[property];
        const clients = this.client instanceof MultyxTeam
            ? new Set(this.client.clients)
            : new Set([this.client]);
        this.client.server?.editUpdate(this, clients);
        return this;
    }

    get raw() {
        const parsed: RawObject = {};
        
        for(const prop in this.data) {
            const m = this.data[prop];

            if(m instanceof MultyxValue) {
                parsed[prop] = m.value;
            } else {
                parsed[prop] = m.raw;
            }
        }

        return parsed;
    }

    getRawPublic(team: MultyxTeam = MultyxClients): RawObject {
        const parsed: RawObject = {};
        
        for(const prop in this.data) {
            const m = this.data[prop];

            if(m instanceof MultyxValue) {
                if(m.isPublic(team)) parsed[prop] = m.value;
            } else {
                parsed[prop] = m.raw;
            }
        }

        return parsed;
    }

    _buildConstraintTable() {
        const table: RawObject = {};

        for(const prop in this.data) {
            table[prop] = this.data[prop]._buildConstraintTable();
        }

        return table;
    }

    editPropertyPath(newPath: string[]) {
        this.propertyPath = newPath;
        for(const prop in this.data) {
            if(this.data[prop] instanceof MultyxObject) {
                this.editPropertyPath([...this.propertyPath, prop]);
            } else {
                this.data[prop].propertyPath = [...this.propertyPath, prop];
            }
        }
    }
}

export class MultyxList extends MultyxObject {
    length: number;

    allowItemChange: boolean;
    allowItemAddition: boolean;
    allowItemDeletion: boolean;

    private _raw: any[];
    public get raw(): any[] {
        return this._raw;
    }
    public set raw(value: any[]) {
        this._raw = value;
    }

    constructor(list: (RawObject | Value | MultyxObject)[], client: Client | MultyxTeam, propertyPath: string[] = []) {
        super({}, client, propertyPath);
        this.length = 0;
        this.allowItemAddition = true;
        this.allowItemChange = true;
        this.allowItemDeletion = true;
        this.raw = [];
        this.push(...list);
    }

    /**
     * Get the ClientValue object of a property
     */
    get(index: string | number): any {
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
    set(index: number | string, value: Value | RawObject | MultyxObject) {
        if(this.disabled) return false;
        index = typeof index == 'string' ? parseInt(index) : index;
        
        if(value === undefined) {
            if(!this.allowItemDeletion) return false;
            if(index == this.length - 1) this.length--;
            const result = super.delete(index.toString());
            if(result) this.raw.splice(index, 1);
            return result;
        }

        if(!this.allowItemAddition && index >= this.length) return false;
        if(!this.allowItemChange && index < this.length) return false;

        const result = super.set(index.toString(), value);
        if(result) {
            this.length = Math.max(index+1, this.length);
            const item = this.get(index);
            this.raw[index] = item instanceof MultyxValue ? item.value : item.raw
        }
        return result;
    }

    push(...items: any) {
        for(const item of items) {
            this.set(this.length, item);
        }
        return this.length;
    }

    pop(): MultyxObject | MultyxValue {
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

export class MultyxValue {
    value: Value;
    disabled: boolean;
    constraints: Map<string, { args: any[], func: (value: Value) => Value | null }>;
    manualConstraints: ((value: Value) => Value | null)[];
    bannedValues: Set<Value>;

    private publicTeams: Set<MultyxTeam>;
    propertyPath: string[];
    client: Client | MultyxTeam;

    constructor(value: Value, client: Client | MultyxTeam, propertyPath: string[]) {
        this.value = value;
        this.disabled = false;
        this.constraints = new Map();
        this.manualConstraints = [];
        this.bannedValues = new Set();

        this.publicTeams = new Set();
        this.propertyPath = propertyPath;
        this.client = client;

        if(this.client instanceof MultyxTeam) {
            this.publicTeams.add(this.client);
        }
    }

    disable() {
        this.disabled = true;
        return this;
    }

    enable() {
        this.disabled = false;
        return this;
    }

    public(team: MultyxTeam = MultyxClients) {
        this.publicTeams.add(team);
        team.public.add(this);
    }

    isPublic(team: MultyxTeam = MultyxClients): boolean {
        return this.publicTeams.has(team);
    }

    set(value: Value): false | { clients: Set<Client> } {

        // Check if value setting changes constraints
        const oldValue = value;
        for(const [_, { func }] of this.constraints.entries()) {
            const constrained = func(value);
            if(constrained === null) return false;
            value = constrained;
        }

        for(const constraint of this.manualConstraints) {
            const constrained = constraint(value);
            if(constrained === null) return false;
            value = constrained;
        }

        if(this.bannedValues.has(value)) return false;

        this.value = value;

        const clients = new Set<Client>(
            this.client instanceof MultyxTeam ? Array.from(this.client.clients) : [this.client]
        );
        
        // Create client list
        for(const team of this.publicTeams) {
            for(const client of team.clients) {
                clients.add(client);
            }
        }

        // Tell client to relay update
        this.client.server.editUpdate(this, clients);
        return { clients };
    }

    _buildConstraintTable() {
        const obj: RawObject = {};
        
        for(const [cname, { args }] of this.constraints.entries()) {
            obj[cname] = args;
        }
        
        return obj;
    }

    /**
     * Set a minimum value for this property
     * If requested value is lower, the accepted value will be the minimum value
     * @param value Minimum value to allow
     * @returns Same multyx object
     */
    min = (value: Value) => {
        this.constraints.set('min', {
            args: [value],
            func: n => n >= value ? n : value
        });
        return this;
    }

    /**
     * Set a maximum value for this property
     * If requested value is higher, the accepted value will be the maximum value
     * @param value Maximum value to allow
     * @returns Same multyx object
     */
    max = (value: Value) => {
        this.constraints.set('max', {
            args: [value],
            func: n => n <= value ? n : value
        });
        return this;
    }

    /**
     * Disallow this property to have specified value
     * Will revert to previous value if requested value is banned
     * @param value Value to ban
     * @returns Same Multyx object
     */
    ban = (value: Value) => {
        this.bannedValues.add(value);
        return this;
    }

    /**
     * Create custom constraint for value
     * Only constrained server-side 
     * @param func Function accepting requested value and returning either null or accepted value. If this function returns null, the value will not be accepted and the change reverted.
     * @returns Same Multyx object
     */
    constrain = (func: ((value: Value) => Value | null)) => {
        this.manualConstraints.push(func);
        return this;
    }
}