"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultyxValue = exports.MultyxList = exports.MultyxObject = void 0;
const client_1 = require("./client");
class MultyxObject {
    constructor(object, client, propertyPath = []) {
        this.data = {};
        this.propertyPath = propertyPath;
        this.client = client;
        this.disabled = false;
        for (const prop in object) {
            this.data[prop] = new (Array.isArray(object[prop]) ? MultyxList
                : typeof object[prop] == 'object' ? MultyxObject
                    : MultyxValue)(object[prop], client, [...propertyPath, prop]);
        }
    }
    disable() {
        for (const prop in this.data) {
            this.data[prop].disable();
        }
        this.disabled = true;
        return this;
    }
    enable() {
        for (const prop in this.data) {
            this.data[prop].enable();
        }
        this.disabled = false;
        return this;
    }
    public(team = client_1.MultyxClients) {
        for (const prop in this.data) {
            this.data[prop].public(team);
        }
        return this;
    }
    /**
     * Check if property is in object
     */
    has(property) {
        return property in this.data;
    }
    /**
     * Get the ClientValue object of a property
     */
    get(property) {
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
    set(property, value) {
        var _a;
        // If just a normal value change, no need to update shape, can return
        if (typeof value !== "object" && this.data[property] instanceof MultyxValue) {
            return this.data[property].set(value);
        }
        const propertyPath = [...this.propertyPath, property];
        if (Array.isArray(value)) {
            this.data[property] = new MultyxList(value, this.client, propertyPath);
        }
        else if (typeof value !== "object") {
            this.data[property] = new MultyxValue(value, this.client, propertyPath);
        }
        else if (!(value instanceof MultyxObject)) {
            this.data[property] = new MultyxObject(value, this.client, propertyPath);
        }
        else {
            this.data[property] = value;
            value.editPropertyPath(propertyPath);
        }
        if (this.client instanceof client_1.MultyxTeam) {
            const clients = this.client instanceof client_1.MultyxTeam
                ? new Set(this.client.clients)
                : new Set([this.client]);
            (_a = this.client.server) === null || _a === void 0 ? void 0 : _a.editUpdate(this, clients);
        }
        return this;
    }
    delete(property) {
        var _a;
        delete this.data[property];
        const clients = this.client instanceof client_1.MultyxTeam
            ? new Set(this.client.clients)
            : new Set([this.client]);
        (_a = this.client.server) === null || _a === void 0 ? void 0 : _a.editUpdate(this, clients);
        return this;
    }
    get raw() {
        const parsed = {};
        for (const prop in this.data) {
            const m = this.data[prop];
            if (m instanceof MultyxValue) {
                parsed[prop] = m.value;
            }
            else {
                parsed[prop] = m.raw;
            }
        }
        return parsed;
    }
    getRawPublic(team = client_1.MultyxClients) {
        const parsed = {};
        for (const prop in this.data) {
            const m = this.data[prop];
            if (m instanceof MultyxValue) {
                if (m.isPublic(team))
                    parsed[prop] = m.value;
            }
            else {
                parsed[prop] = m.raw;
            }
        }
        return parsed;
    }
    _buildConstraintTable() {
        const table = {};
        for (const prop in this.data) {
            table[prop] = this.data[prop]._buildConstraintTable();
        }
        return table;
    }
    editPropertyPath(newPath) {
        this.propertyPath = newPath;
        for (const prop in this.data) {
            if (this.data[prop] instanceof MultyxObject) {
                this.editPropertyPath([...this.propertyPath, prop]);
            }
            else {
                this.data[prop].propertyPath = [...this.propertyPath, prop];
            }
        }
    }
}
exports.MultyxObject = MultyxObject;
class MultyxList extends MultyxObject {
    get raw() {
        return this._raw;
    }
    set raw(value) {
        this._raw = value;
    }
    constructor(list, client, propertyPath = []) {
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
    get(index) {
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
    set(index, value) {
        if (this.disabled)
            return false;
        index = typeof index == 'string' ? parseInt(index) : index;
        if (value === undefined) {
            if (!this.allowItemDeletion)
                return false;
            if (index == this.length - 1)
                this.length--;
            const result = super.delete(index.toString());
            if (result)
                this.raw.splice(index, 1);
            return result;
        }
        if (!this.allowItemAddition && index >= this.length)
            return false;
        if (!this.allowItemChange && index < this.length)
            return false;
        const result = super.set(index.toString(), value);
        if (result) {
            this.length = Math.max(index + 1, this.length);
            const item = this.get(index);
            this.raw[index] = item instanceof MultyxValue ? item.value : item.raw;
        }
        return result;
    }
    push(...items) {
        for (const item of items) {
            this.set(this.length, item);
        }
        return this.length;
    }
    pop() {
        this.length--;
        this.raw.pop();
        const result = this.get(this.length);
        this.delete(this.length.toString());
        return result;
    }
    unshift(...items) {
        this.length += items.length;
        for (let i = this.length - 1; i >= 0; i--) {
            if (i >= items.length)
                this.set(i, this.get(i - items.length));
            else
                this.set(i, items[i]);
        }
        return this.length;
    }
    shift() {
        if (this.length == 0)
            return undefined;
        this.length--;
        const first = this.get("0");
        for (let i = 0; i < this.length; i++) {
            this.set(i, this.get(i + 1));
        }
        return first;
    }
    filter(predicate) {
        const keep = [];
        for (let i = 0; i < this.length; i++) {
            keep.push(predicate(this.get(i), i, this));
        }
        let negativeOffset = 0;
        for (let i = 0; i < keep.length; i++) {
            if (keep[i] && negativeOffset)
                this.set(i - negativeOffset, this.get(i));
            if (!keep[i])
                negativeOffset--;
        }
    }
    map(callbackfn) {
        for (let i = 0; i < this.length; i++) {
            this.set(i, callbackfn(this.get(i), i, this));
        }
    }
    flat() {
        for (let i = 0; i < this.length; i++) {
            const item = this.get(i);
            if (item instanceof MultyxList) {
                this.set(i, item.raw[0]);
                for (const child of item.raw.slice(1)) {
                    this.length++;
                    i++;
                    this.set(i, child);
                }
            }
        }
    }
    reduce(callbackfn, startingAccumulator) {
        for (let i = 0; i < this.length; i++) {
            startingAccumulator = callbackfn(startingAccumulator, this.get(i), i, this);
        }
        return startingAccumulator;
    }
    reduceRight(callbackfn, startingAccumulator) {
        for (let i = this.length - 1; i >= 0; i--) {
            startingAccumulator = callbackfn(startingAccumulator, this.get(i), i, this);
        }
        return startingAccumulator;
    }
    reverse() {
        let right = this.length - 1;
        for (let left = 0; left < right; left++) {
            const a = this.get(left);
            const b = this.get(right);
            this.set(left, b);
            this.set(right, a);
        }
        return this;
    }
    forEach(callbackfn) {
        for (let i = 0; i < this.length; i++) {
            callbackfn(this.get(i), i, this);
        }
    }
    every(predicate) {
        for (let i = 0; i < this.length; i++) {
            if (!predicate(this.get(i), i, this))
                return false;
        }
        return true;
    }
    some(predicate) {
        for (let i = 0; i < this.length; i++) {
            if (predicate(this.get(i), i, this))
                return true;
        }
        return false;
    }
    find(predicate) {
        for (let i = 0; i < this.length; i++) {
            if (predicate(this.get(i), i, this))
                return this.get(i);
        }
        return undefined;
    }
    findIndex(predicate) {
        for (let i = 0; i < this.length; i++) {
            if (predicate(this.get(i), i, this))
                return i;
        }
        return -1;
    }
    entries() {
        const entryList = [];
        for (let i = 0; i < this.length; i++) {
            entryList.push([this.get(i), i]);
        }
        return entryList;
    }
    keys() {
        return Array(this.length).fill(0).map((_, i) => i);
    }
}
exports.MultyxList = MultyxList;
class MultyxValue {
    constructor(value, client, propertyPath) {
        /**
         * Set a minimum value for this property
         * If requested value is lower, the accepted value will be the minimum value
         * @param value Minimum value to allow
         * @returns Same multyx object
         */
        this.min = (value) => {
            this.constraints.set('min', {
                args: [value],
                func: n => n >= value ? n : value
            });
            return this;
        };
        /**
         * Set a maximum value for this property
         * If requested value is higher, the accepted value will be the maximum value
         * @param value Maximum value to allow
         * @returns Same multyx object
         */
        this.max = (value) => {
            this.constraints.set('max', {
                args: [value],
                func: n => n <= value ? n : value
            });
            return this;
        };
        /**
         * Disallow this property to have specified value
         * Will revert to previous value if requested value is banned
         * @param value Value to ban
         * @returns Same Multyx object
         */
        this.ban = (value) => {
            this.bannedValues.add(value);
            return this;
        };
        /**
         * Create custom constraint for value
         * Only constrained server-side
         * @param func Function accepting requested value and returning either null or accepted value. If this function returns null, the value will not be accepted and the change reverted.
         * @returns Same Multyx object
         */
        this.constrain = (func) => {
            this.manualConstraints.push(func);
            return this;
        };
        this.value = value;
        this.disabled = false;
        this.constraints = new Map();
        this.manualConstraints = [];
        this.bannedValues = new Set();
        this.publicTeams = new Set();
        this.propertyPath = propertyPath;
        this.client = client;
        if (this.client instanceof client_1.MultyxTeam) {
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
    public(team = client_1.MultyxClients) {
        this.publicTeams.add(team);
        team.public.add(this);
    }
    isPublic(team = client_1.MultyxClients) {
        return this.publicTeams.has(team);
    }
    set(value) {
        // Check if value setting changes constraints
        const oldValue = value;
        for (const [_, { func }] of this.constraints.entries()) {
            const constrained = func(value);
            if (constrained === null)
                return false;
            value = constrained;
        }
        for (const constraint of this.manualConstraints) {
            const constrained = constraint(value);
            if (constrained === null)
                return false;
            value = constrained;
        }
        if (this.bannedValues.has(value))
            return false;
        this.value = value;
        const clients = new Set(this.client instanceof client_1.MultyxTeam ? Array.from(this.client.clients) : [this.client]);
        // Create client list
        for (const team of this.publicTeams) {
            for (const client of team.clients) {
                clients.add(client);
            }
        }
        // Tell client to relay update
        this.client.server.editUpdate(this, clients);
        return { clients };
    }
    _buildConstraintTable() {
        const obj = {};
        for (const [cname, { args }] of this.constraints.entries()) {
            obj[cname] = args;
        }
        return obj;
    }
}
exports.MultyxValue = MultyxValue;
