import { RawObject } from "../types";

/**
 * @example
 * ```js
 * const a = { a: 3, b: { c: 4 } };
 * const b = { d: 1, b: { e: 2 } };
 * 
 * const merged = MergeRawObjects({ ...a }, { ...b });
 * console.log(merged); // { a: 3, b: { c: 4, e: 2 }, d: 1 }
 * ```
 * @param target any object
 * @param source any object
 * @returns merged object
 */
export function MergeRawObjects(target: RawObject, source: RawObject) {
    for (const key in source) {
        if(source[key] instanceof Object && target.hasOwnProperty(key) && target[key] instanceof Object) {
            MergeRawObjects(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

/**
 * Turn Map<any, any> into RawObject
 * 
 * coolest mf piece of code ive written it looks so cool wtf
 * @param target Map to transform into object
 * @param key Map key to string transform function
 * @param value Map value to object value transform function
 * @returns Transformed object
 */
export function MapToObject<K, V>(
    target: Map<K, V>,
    key?: (c: K) => string,
    value?: (v: V) => any
): RawObject {
    const entries = Array.from(target.entries()).map(
        ([k, v]: [K, V]) => [
            key ? key(k) : k,
            value ? value(v) : v
        ]);

    const obj: RawObject = {};
    for(const [k, v] of entries) obj[k] = v;
    return obj;
}