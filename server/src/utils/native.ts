/*

Symbols used as class method identifiers to indicate privacy
and disallow use outside of Multyx ecosystem

*/

export const Parse = Symbol("parse");
export const Get = Symbol("get");
export const Value = Symbol("value");
export const Edit = Symbol("edit");
export const Send = Symbol("send");
export const Self = Symbol("self");
export const Build = Symbol("build");
export const Remove = Symbol("remove");

export class EditWrapper {
    value: any;

    /**
     * Used when client is editing value
     * @param value Value to set
     */
    constructor(value: any) {
        this.value = value;
    }
}