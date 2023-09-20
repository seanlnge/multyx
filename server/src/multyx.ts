import { Client } from "./client";
import { RawObject, Value } from "./types";
import { EditUpdate } from "./update";

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

    /**
     * Get the explicit value of the ClientValue object of a property
     * @example
     * ```js
     * // Client
     * client.player.x = 9;
     * 
     * // Server
     * console.log(client.player.getValue('x')); // 9
     * ```
     */
    getValue(property: string) {
        const mval = this.data[property];

        if(!mval || (mval instanceof MultyxObject)) {
            throw new Error("cannot alter shape of MultyxObject");
        }

        return mval.value;
    }

    parse() {
        const parsed: RawObject = {};
        
        for(const prop in this.data) {
            const m = this.data[prop];

            if(m instanceof MultyxValue) {
                parsed[prop] = m.get();
            } else {
                parsed[prop] = m.parse();
            }
        }

        return parsed;
    }

    parsePublicized(team: MultyxTeam = MultyxClients): RawObject {
        const parsed: RawObject = {};
        
        for(const prop in this.data) {
            const m = this.data[prop];

            if(m instanceof MultyxValue) {
                if(m.isPublic(team)) parsed[prop] = m.get();
            } else {
                parsed[prop] = m.parse();
            }
        }

        return parsed;
    }

    buildConstraintTable() {
        const table: RawObject = {};

        for(const prop in this.data) {
            table[prop] = this.data[prop].buildConstraintTable();
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
 
    get() {
        return this.value;
    }

    set(value: Value): false | { clients: Set<Client> } {
        // Check if value setting changes constraints
        if(this.disabled) return false;
        
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
        if(oldValue === this.value) clients.delete(this.client);

        // Tell client to relay update
        this.client.server.editUpdate(this, clients);
        return { clients };
    }

    buildConstraintTable() {
        const obj: RawObject = {};
        
        for(const [cname, { args }] of this.constraints.entries()) {
            obj[cname] = args;
        }
        
        return obj;
    }

    min = (value: Value, harsh: boolean = false) => {
        this.constraints.set('min', {
            args: [value, harsh],
            func: n => n >= value ? n : harsh ? null : value
        });
        return this;
    }

    max = (value: Value, harsh: boolean = false) => {
        this.constraints.set('max', {
            args: [value, harsh],
            func: n => n <= value ? n : harsh ? null : value
        });
        return this;
    }

    ban = (value: Value) => {
        this.bannedValues.add(value);
        return this;
    }

    constrain = (func: ((value: Value) => Value | null)) => {
        this.manualConstraints.push(func);
        return this;
    }
}

export class MultyxTeam {
    clients: Set<Client>;
    publicData: Set<MultyxValue>;

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

    addClient(client: Client) {
        this.clients.add(client);
        client.teams.add(this);
    }

    parsePublicized(): Map<Client, RawObject> {
        const parsed = new Map();
        this.clients.forEach(c =>
            parsed.set(c, c.shared.parsePublicized(this))
        );
        return parsed;
    }
}

export const MultyxClients = new MultyxTeam();