import { Client } from "../agents/client";
import { MultyxClients, MultyxTeam } from "../agents/team";
import { RawObject, Value } from "../types";

export class MultyxValue {
    value: Value;
    disabled: boolean;
    constraints: Map<string, { args: any[], func: (value: Value) => Value | null }>;
    manualConstraints: ((value: Value) => Value | null)[];
    bannedValues: Set<Value>;

    private publicTeams: Set<MultyxTeam>;
    propertyPath: string[];
    client: Client | MultyxTeam;

    constructor(value: Value | MultyxValue, client: Client | MultyxTeam, propertyPath: string[]) {
        this.value = value instanceof MultyxValue ? value.value : value;
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

    // Allows MultyxValue to be treated as any other standard value
    toString() {
        return this.value.toString();
    }

    valueOf() {
        return this.value;
    }

    [Symbol.toPrimitive]() {
        return this.value;
    }

    // Methods so that they can be chained => a.disable().public().min(3000)
    disable() {
        this.disabled = true;
        return this;
    }

    enable() {
        this.disabled = false;
        return this;
    }

    // Just to store information, Multyx engine determines what info gets shared
    public(team: MultyxTeam = MultyxClients) {
        this.publicTeams.add(team);
        team.public.add(this);
    }

    isPublic(team: MultyxTeam = MultyxClients): boolean {
        return this.publicTeams.has(team);
    }

    // Only proper way to set value of MultyxValue to ensure client sync
    set(value: Value | MultyxValue): boolean {
        if(value instanceof MultyxValue) value = value.value;

        // Check if value setting changes constraints
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

        // Get all clients affected by this change
        const clients = new Set<Client>(
            this.client instanceof MultyxTeam ? Array.from(this.client.clients) : [this.client]
        );
        
        // Get all clients informed of this change
        if(this.client instanceof Client) for(const team of this.publicTeams) {
            for(const client of team.clients) {
                clients.add(client);
            }
        }

        // Tell server to relay update to all clients
        this.client.server.editUpdate(this, clients);
        return true;
    }

    // Only gets called on initialization of websocket client
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