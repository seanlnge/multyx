import type { Agent, Client, MultyxTeam } from "../agents";

import { Value } from "../types";
import { Edit, Self, Send } from "../utils/native";
import MultyxUndefined from "./undefined";

export default class MultyxValue {
    value: Value;
    propertyPath: string[];

    agent: Agent;
    private publicAgents: Set<Agent>;

    disabled: boolean;

    constraints: Map<string, { args: any[], func: (value: Value) => Value | null }>;
    manualConstraints: ((value: Value) => Value | null)[];
    bannedValues: Set<Value>;

    /**
     * Create a MultyxItem representation of a primitive
     * @param value Value to turn into MultyxItem
     * @param agent Client or MultyxTeam hosting this MultyxItem
     * @param propertyPath Entire path leading from agent to root
     */
    constructor(value: Value | MultyxValue, agent: Agent, propertyPath: string[]) {
        this.disabled = false;
        this.constraints = new Map();
        this.manualConstraints = [];
        this.bannedValues = new Set();
        this.publicAgents = new Set();

        this.propertyPath = propertyPath;
        this.agent = agent;
        this.publicAgents.add(this.agent);

        this.set(value);
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
        this[Send]();
        return true;
    }

    /**
     * Send an EditUpdate
     * @param agent Agent to send EditUpdate to, if undefined, send to all public agents
     */
    [Send](agent?: Agent) {
        const clients = new Set<Client>();
        
        // Get all clients informed of this change
        if(agent) {
            for(const c of agent.clients) clients.add(c);
        } else {
            for(const a of this.publicAgents) {
                for(const c of a.clients) clients.add(c);
            }
        }

        // Tell server to relay update to all clients
        this.agent.server[Edit](this, clients);
    }

    /**
     * Send a ConstraintUpdate
     */
    [Self](name: string, constraint: { args: any[], func: (value: Value) => Value | null }) {
        //this.agent.server[Self](this.agent, 'constraint', {})
    }

    /**
     * Edit the property path
     * @param newPath New property path to set value at
     */
    [Edit](newPath: string[]) {
        this.propertyPath = newPath;
        this[Send]();        
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
     * @returns Same MultyxValue
     */
    constrain = (func: ((value: Value) => Value | null)) => {
        this.manualConstraints.push(func);
        return this;
    }

    /**
     * Disable setting value of MultyxValue
     * @returns Same MultyxValue
     */
    disable() {
        this.disabled = true;
        return this;
    }

    /**
     * Enable setting value of MultyxValue
     * @returns Same MultyxValue
     */
    enable() {
        this.disabled = false;
        return this;
    }

    /**
     * Publicize MultyxValue from specific MultyxTeam
     * @param team MultyxTeam to share MultyxValue to
     * @returns Same MultyxValue
     */
    addPublic(team: MultyxTeam) {
        if(this.publicAgents.has(team)) return this;

        this.publicAgents.add(team);
        team.addPublic(this);
        
        this[Send](team);

        return this;
    }

    /**
     * Privitize MultyxValue from specific MultyxTeam
     * @param team MultyxTeam to hide MultyxValue from
     * @returns Same MultyxValue
     */
    removePublic(team: MultyxTeam) {
        if(!this.publicAgents.has(team)) return this;

        this.publicAgents.delete(team);
        team.removePublic(this);

        // Send an EditUpdate clearing property from clients
        new MultyxUndefined(team, this.propertyPath);

        return this;
    }

    /**
     * Check if MultyxValue is visible to specific MultyxTeam
     * @param team MultyxTeam to check for visibility from
     * @returns Boolean, true if MultyxValue is visible to team, false otherwise
     */
    isPublic(team: MultyxTeam): boolean {
        return this.publicAgents.has(team);
    }

    /* Native methods to allow MultyxValue to be treated as primitive */
    toString = () => this.value.toString();
    valueOf = () => this.value;
    [Symbol.toPrimitive] = () => this.value;
}