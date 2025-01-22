import type Multyx from '../';
import { Message } from "../message";
import { Constraint, RawObject, Value } from "../types";
import { BuildConstraint, EditWrapper, Unpack } from '../utils';

export default class MultyxClientValue {
    private _value: Value;
    private multyx: typeof Multyx;
    propertyPath: string[];
    editable: boolean;
    constraints: { [key: string]: Constraint };

    private interpolator: undefined | {
        get: () => Value,
        set: () => void,
        history: { time: number, value: Value }[]
    };

    get value() {
        if(this.interpolator) return this.interpolator.get();
        return this._value;
    }

    set value(v) {
        this._value = v;
        if(this.interpolator) this.interpolator.set();
    }

    constructor(multyx: typeof Multyx, value: Value | EditWrapper<Value>, propertyPath: string[] = [], editable: boolean) {
        this.propertyPath = propertyPath;
        this.editable = editable;
        this.multyx = multyx;
        this.constraints = {};
        this.set(value);
    }

    set(value: Value | EditWrapper<Value>) {
        if(value instanceof EditWrapper) {
            this.value = value.value;
            return true;
        }

        // Attempting to edit property not editable to client
        if(!this.editable) return false;

        let nv = value;
        for(const fn of Object.values(this.constraints)) {
            nv = fn(nv);
            if(nv === null) return false;
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

    /**
     * Linearly interpolate value across frames
     * Will run 1/2 frame behind on average
     */
    Lerp() {
        this.interpolator = {
            history: [
                { value: this._value, time: Date.now() },
                { value: this._value, time: Date.now() }
            ],
            get: () => {
                const [e, s] = this.interpolator.history;
                const ratio = Math.min(1, (Date.now() - e.time) / Math.min(250, e.time - s.time));
                if(Number.isNaN(ratio) || typeof e.value != 'number' || typeof s.value != 'number') return s.value;
                return e.value * ratio + s.value * (1 - ratio);
            },
            set: () => {
                this.interpolator.history.pop();
                this.interpolator.history.unshift({
                    value: this._value,
                    time: Date.now()
                });
            }
        }
    }

    PredictiveLerp() {
        this.interpolator = {
            history: [
                { value: this._value, time: Date.now() },
                { value: this._value, time: Date.now() }
            ],
            get: () => {
                const [e, s] = this.interpolator.history;
                const ratio = 0 + Math.min(1, (Date.now() - e.time) / Math.min(250, e.time - s.time));
                if(Number.isNaN(ratio) || typeof e.value != 'number' || typeof s.value != 'number') return e.value;
                return e.value * (1 + ratio) - s.value * ratio;
            },
            set: () => {
                this.interpolator.history.pop();
                this.interpolator.history.unshift({
                    value: this._value,
                    time: Date.now()
                });
            }
        }
    }

    /* Native methods to allow MultyxValue to be treated as primitive */
    toString = () => this.value.toString();
    valueOf = () => this.value;
    [Symbol.toPrimitive] = () => this.value;
}