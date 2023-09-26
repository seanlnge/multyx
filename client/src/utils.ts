import { Constraint, Value } from "./types";

export const isProxy = Symbol('isProxy');

export class EditWrapper {
    data: any;

    constructor(data: any) {
        this.data = data;
    }
}

export function BuildConstraint(name: string, args: Value[]): Constraint {
    if(name == 'min') return n => n >= args[0] ? n : args[0];
    if(name == 'max') return n => n <= args[0] ? n : args[0];

    return I => I;
}