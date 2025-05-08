import type Multyx from '../';
import { Message } from "../message";
import { Constraint, RawObject, Value } from "../types";
import { BuildConstraint, EditWrapper, Unpack } from '../utils';

export default class MultyxClientValue {
    private _value: Value;
    private multyx: Multyx;
    propertyPath: string[];
    editable: boolean;
    constraints: { [key: string]: Constraint };

    onChange: (value: Value, previousValue: Value) => void;
    onChangeDeny: (attemptedValue: Value, currentValue: Value) => boolean;

    get value() {
        return this._value;
    }

    set value(v) {
        this._value = v;
    }

    constructor(multyx: Multyx, value: Value | EditWrapper<Value>, propertyPath: string[] = [], editable: boolean) {
        this.propertyPath = propertyPath;
        this.editable = editable;
        this.multyx = multyx;
        this.constraints = {};
        this.set(value);
    }

    set(value: Value | EditWrapper<Value>) {
        if(value instanceof EditWrapper) {
            const oldValue = this.value;
            this.value = value.value;
            this.onChange?.(value.value, oldValue);
            return true;
        }

        // Attempting to edit property not editable to client
        if(!this.editable) {
            if(this.multyx.options.verbose) {
                console.error(`Attempting to set property that is not editable. Setting '${this.propertyPath.join('.')}' to ${value}`);
            }
            this.onChangeDeny?.(value, this.value);
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
                this.onChangeDeny?.(value, this.value);
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