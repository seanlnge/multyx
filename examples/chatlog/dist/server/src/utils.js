"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateUUID = GenerateUUID;
exports.MergeRawObjects = MergeRawObjects;
exports.MapToObject = MapToObject;
const UUIDSet = new Set();
function GenerateUUID(length = 8, radix = 36) {
    const unit = radix ** (length - 1);
    const uuid = Math.floor(Math.random() * (radix * unit - unit) + unit).toString(radix);
    if (UUIDSet.has(uuid))
        return GenerateUUID(length, radix);
    UUIDSet.add(uuid);
    return uuid;
}
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
function MergeRawObjects(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && target.hasOwnProperty(key) && target[key] instanceof Object) {
            MergeRawObjects(target[key], source[key]);
        }
        else {
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
function MapToObject(target, key, value) {
    const entries = Array.from(target.entries()).map(([k, v]) => [
        key ? key(k) : k,
        value ? value(v) : v
    ]);
    const obj = {};
    for (const [k, v] of entries)
        obj[k] = v;
    return obj;
}
