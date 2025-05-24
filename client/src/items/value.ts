import type Multyx from '../';
import { Message } from "../message";
import { Constraint, RawObject, Value } from "../types";
import { BuildConstraint, Done, Edit, EditWrapper, Unpack } from '../utils';

export default class MultyxClientValue {
    private _value: Value;
    private multyx: Multyx;
    propertyPath: string[];
    editable: boolean;
    constraints: { [key: string]: Constraint };

    private readModifiers: ((value: Value) => Value)[] = [];
    private editCallbacks: ((value: Value, previousValue: Value) => void)[] = [];
    
    get value() {
        return this.readModifiers.reduce((value, modifier) => modifier(value), this._value);
    }

    set value(v) {
        this._value = v;
    }

    addReadModifier(modifier: (value: Value) => Value) {
        this.readModifiers.push(modifier);
    }

    addEditCallback(callback: (value: Value, previousValue: Value) => void) {
        this.editCallbacks.push(callback);
    }

    [Edit](updatePath: string[], value: any) {
        if(updatePath.length != 0) return;

        this.set(new EditWrapper(value));
    }

    constructor(multyx: Multyx, value: Value | EditWrapper<Value>, propertyPath: string[] = [], editable: boolean) {
        this.propertyPath = propertyPath;
        this.editable = editable;
        this.multyx = multyx;
        this.constraints = {};
        this.set(value);

        const propSymbol = Symbol.for("_" + this.propertyPath.join('.'));
        if(this.multyx.events.has(propSymbol)) {
            this.multyx[Done].push(...this.multyx.events.get(propSymbol).map(e =>
                () => e(this.value)
            ));
        }
    }

    set(value: Value | EditWrapper<Value>) {
        if(value instanceof EditWrapper) {
            const oldValue = this.value;
            this.value = value.value;
            this.editCallbacks.forEach(fn => fn(value.value, oldValue));
            return true;
        }

        // Attempting to edit property not editable to client
        if(!this.editable) {
            if(this.multyx.options.verbose) {
                console.error(`Attempting to set property that is not editable. Setting '${this.propertyPath.join('.')}' to ${value}`);
            }
            return false;
        }

        let nv = value;
        for(const constraint in this.constraints) {
            const fn = this.constraints[constraint];
            nv = fn(nv);
            
            if(nv === null) {
                if(this.multyx.options.verbose) {
                    console.error(`Attempting to set property that failed on constraint. Setting '${this.propertyPath.join('.')}' to ${value}, stopped by constraint '${constraint}'`);
                }
                return false;
            }
        }

        if(this.value === nv) {
            this.value = nv;
            return true;
        }

        this.value = nv;

        this.multyx.ws.send(Message.Native({
            instruction: 'edit',
            path: this.propertyPath,
            value: nv
        }));
        return true;
    }

    /**
     * Unpack constraints sent from server and store 
     * @param constraints Packed constraints from server
     */
    [Unpack](constraints: RawObject) {
        for(const [cname, args] of Object.entries(constraints)) {
            const constraint = BuildConstraint(cname, args as Value[]);
            if(!constraint) continue;
            this.constraints[cname] = constraint;
        }
    }

    /* Native methods to allow MultyxValue to be treated as primitive */
    toString = () => this.value.toString();
    valueOf = () => this.value;
    [Symbol.toPrimitive] = () => this.value;
}