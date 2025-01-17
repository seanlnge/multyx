import { RawObject, Value } from "../types";
import { MultyxValue } from "./value";
import { MultyxList } from "./list";
import { MultyxType } from ".";
import { Client } from "../agents/client";
import { MultyxClients, MultyxTeam } from "../agents/team";

export class MultyxObject {
    data: { [key: string]: MultyxType<any> };
    propertyPath: string[];
    agent: Client | MultyxTeam;
    disabled: boolean;
    shapeDisabled: boolean;
    
    // spent 2 hours tryna make this [key: Exclude<string, keyof MultyxObject>]: MultyxType<any>
    // fuck you ryan cavanaugh https://github.com/microsoft/TypeScript/issues/17867
    [key: string]: any;

    constructor(object: RawObject, agent: Client | MultyxTeam, propertyPath: string[] = [agent.uuid]) {
        this.data  = {};
        this.propertyPath = propertyPath;
        this.agent = agent;
        this.disabled = false;
        this.shapeDisabled = false;

        for(const prop in object) {
            this.data[prop] = new (
                Array.isArray(object[prop]) ? MultyxList
                : typeof object[prop] == 'object' ? MultyxObject
                : MultyxValue
            )(object[prop], agent, [...propertyPath, prop]);

            if(!(prop in this)) this[prop] = this.data[prop];   
        }

        // Apply proxy inside MultyxList constructor rather than here
        if(this instanceof MultyxList) return this;

        return new Proxy(this, {
            // Allow clients to access properties in MultyxObject without using get
            get: (o, p: string) => {
                if(p in o) return o[p];
                return o.get(p) as MultyxType<any>; 
            },
            
            // Allow clients to set MultyxObject properties by client.self.a = b
            set: (o, p: string, v) => {
                if(p in o) {
                    o[p] = v;
                    return true;
                }
                return !!o.set(p, v);
            }
        });
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

    disableShape(recursive = false) {
        if(recursive) {
            for(const prop in this.data) {
                if(this.data[prop] instanceof MultyxObject) {
                    this.data[prop].shapeDisabled = true;
                }
            }
        }
        this.shapeDisabled = true;
    }

    enableShape(recursive = false) {
        if(recursive) {
            for(const prop in this.data) {
                if(this.data[prop] instanceof MultyxObject) {
                    this.data[prop].shapeDisabled = false;
                }
            }
        }
        this.shapeDisabled = false;
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
    get(property: string) {
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
    set(property: string, value: any): MultyxObject | false {
        // If just a normal value change, no need to update shape, can return
        if(typeof value !== "object" && this.data[property] instanceof MultyxValue) {
            const attempt = (this.data[property] as MultyxValue).set(value);
            return attempt ? this : false;
        }

        if(this.shapeDisabled) return false;
        const propertyPath = [...this.propertyPath, property];

        if(Array.isArray(value)) {
            this.data[property] = new MultyxList(
                value,
                this.agent,
                propertyPath
            );
        } else if(typeof value !== "object") {
            this.data[property] = new MultyxValue(
                value,
                this.agent,
                propertyPath
            );
        } else if(!(value instanceof MultyxObject)) {
            this.data[property] = new MultyxObject(
                value,
                this.agent,
                propertyPath
            );
        } else {
            this.data[property] = value;
            value.editPropertyPath(propertyPath);
        }

        const clients = this.agent instanceof MultyxTeam
            ? new Set(this.agent.clients)
            : new Set([this.agent]);
        this.agent.server?.editUpdate(this, clients);
        
        return this;
    }

    delete(property: string) {
        if(this.shapeDisabled) return false;

        delete this.data[property];
        const clients = this.agent instanceof MultyxTeam
            ? new Set(this.agent.clients)
            : new Set([this.agent]);
        this.agent.server?.editUpdate(this, clients);
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