import { Message } from "../message";
import { Constraint, RawObject, Value } from "../types";
import { BuildConstraint, EditWrapper, Unpack } from "../utils";

export default class MultyxClientValue {
    value: Value;
    propertyPath: string[];
    constraints: { [key: string]: Constraint };
    ws: WebSocket;

    constructor(value: Value, propertyPath: string[], ws: WebSocket) {
        this.value = value;
        this.propertyPath = propertyPath;
        this.ws = ws;
        this.constraints = {};
    }

    set(value: Value | EditWrapper<Value>) {
        if(value instanceof EditWrapper) {
            this.value = value.value;
            return true;
        }

        let nv = value;
        for(const fn of Object.values(this.constraints)) {
            nv = fn(nv);
            if(nv === null) return false;
        }

        if(this.value === nv) return true;
        this.value = nv;

        this.ws.send(Message.Native({
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