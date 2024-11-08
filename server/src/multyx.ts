import { Client } from "./client";
import { RawObject, Value } from "./types";
import { EditUpdate } from "./update";
import { EditWrapper } from "./utils";

export class MultyxObject {
    data: { [key: string]: MultyxObject | MultyxValue };
    propertyPath: string[];
    client: Client;

    constructor(object: RawObject, client: Client, propertyPath: string[] = []) {
        this.data  = {};
        this.propertyPath = propertyPath
        this.client = client;
        
        for(const prop in object) {
            this.data[prop] = new (
                typeof object[prop] == 'object' ? MultyxObject : MultyxValue
            )(object[prop], client, [...propertyPath, prop]);
        }
    }

    disable() {
        for(const prop in this.data) {
            this.data[prop].disable();
        }

        return this;
    }

    enable() {
        for(const prop in this.data) {
            this.data[prop].enable();
        }

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
    set(property: string, value: Value | RawObject | MultyxObject) {
        // If just a normal value change, no need to update shape, can return
        if(typeof value !== "object" && this.data[property] instanceof MultyxValue) {
            return (this.data[property] as MultyxValue).set(value);
        }

        const propertyPath = [...this.propertyPath, property];

        if(typeof value !== "object") {
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

        this.client.server.editUpdate(this, (new Set<Client>()).add(this.client));

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

export class MultyxValue {
    value: string | number | boolean;
    disabled: boolean;
    constraints: Map<string, { args: any[], func: (value: Value) => Value | null }>;
    manualConstraints: ((value: Value) => Value | null)[];
    bannedValues: Set<Value>;

    private publicTeams: Set<MultyxTeam>;
    propertyPath: string[];
    client: Client;

    constructor(value: Value, client: Client, propertyPath: string[]) {
        this.value = value;
        this.disabled = false;
        this.constraints = new Map();
        this.manualConstraints = [];
        this.bannedValues = new Set();

        this.publicTeams = new Set();
        this.propertyPath = propertyPath;
        this.client = client;
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
        team.publicData.add(this);
    }

    isPublic(team: MultyxTeam = MultyxClients): boolean {
        return this.publicTeams.has(team);
    }

    set(value: Value | EditWrapper<Value>): false | { clients: Set<Client> } {
        // If client attempting to edit value
        const isEditWrapper = value instanceof EditWrapper;
        if(value instanceof EditWrapper) {
            if(this.disabled) return false;
            value = value.data;
        }

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

        // Create client list
        const clients = new Set<Client>([this.client]);
        for(const team of this.publicTeams) {
            for(const client of team.clients) {
                clients.add(client);
            }
        }
        if(oldValue === this.value && isEditWrapper) clients.delete(this.client);

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

export class MultyxTeam {
    clients: Set<Client>;
    publicData: Set<MultyxValue>;

    /**
     * Creates a group of clients sharing public data
     * @param clients List of clients to add to team
     * @returns MultyxTeam object
     */
    constructor(clients?: Set<Client> | Client[]) {
        this.publicData = new Set();

        if(!clients) {
            this.clients = new Set();
            return;
        }
        
        this.clients = new Set();
        clients.forEach(c => {
            c.teams.add(this);
            this.clients.add(c);
        });
    }

    /**
     * Retrieve a client object in the team
     * @param uuid UUID of client to retrieve
     * @returns Client if exists in team, else null
     */
    getClient(uuid: string) {
        const client = Array.from(this.clients.values()).find(x => x.uuid == uuid);
        return client ?? null;
    }

    /**
     * Add a client into the team
     * @param client Client object to add to team
     */
    addClient(client: Client) {
        this.clients.add(client);
        client.teams.add(this);
    }

    /**
     * Remove a client from the team
     * @param client Client object to remove from team
     */
    removeClient(client: Client) {
        this.clients.delete(client);
        client.teams.delete(this);
    }

    /**
     * Get raw 
     * @returns 
     */
    getRawPublic(): Map<Client, RawObject> {
        const parsed = new Map();
        this.clients.forEach(c =>
            parsed.set(c, c.self.getRawPublic(this))
        );
        return parsed;
    }
}

export const MultyxClients = new MultyxTeam();