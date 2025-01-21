import { Constraint, RawObject, Value } from "./types";

export const Unpack = Symbol("unpack"); 

export class EditWrapper<T> {
    value: T;

    constructor(value: T) {
        this.value = value;
    }
}

export function PredictiveLerp(object: RawObject, property?: string) {
    if(!property) {
        for(const prop in object) Lerp(object, prop);
        return;
    }

    let start = { value: object[property], time: Date.now() };
    let end = { value: object[property], time: Date.now() };

    Object.defineProperty(object, property, {
        get: () => {
            let ratio = 0 + Math.min(1, (Date.now() - end.time) / (end.time - start.time));
            if(Number.isNaN(ratio)) ratio = 0;
            
            return end.value * (1 + ratio) - start.value * ratio;
        },
        set: (value) => {
            // Don't lerp between edit requests sent in same frame
            if(Date.now() - end.time < 10) {
                end.value = value;
                return true;
            }
            start = { ...end };
            end = { value, time: Date.now() }
            return true;
        }
    });
}

/**
 * Linear interpolate values between client's frames
 * Will not interpolate values on the server-side
 * @returns Same multyx object 
 */
export function Lerp(object: RawObject, property?: string) {
    if(!property) {
        for(const prop in object) Lerp(object, prop);
        return;
    }

    let start = { value: object[property], time: Date.now() };
    let end = { value: object[property], time: Date.now() };
    
    Object.defineProperty(object, property, {
        get: () => {
            let ratio = Math.min(1, (Date.now() - end.time) / (end.time - start.time));
            if(Number.isNaN(ratio)) ratio = 0;
            
            return end.value * ratio + start.value * (1 - ratio);
        },
        set: (value) => {
            // Don't lerp between edit requests sent in same frame
            if(Date.now() - end.time < 10) {
                end.value = value;
                return true;
            }
            start = { ...end };
            end = { value, time: Date.now() }
            return true;
        }
    });
}

/**
 * Set a customized interpolation curve for values to follow 
 * @param values Slices to interpolate through. Time must be between 0 and 1, while progress is the percentage between the old value and new value at the respective time, where 0 represents old value and 1 represents new value 
 * @example
 * ```js
 * car.get('speed').interpolate([
 *  { time: 0, progress: 0 },
 *  { time: 0.2, progress: 0.6 },
 *  { time: 0.4, progress: 1.2 },
 *  { time: 0.6, progress: 1.4 },
 *  { time: 0.8, progress: 1.2 },
 *  { time: 1, progress: 1 }
 * ]);
 * ``` 
 */
export function Interpolate(
    object: RawObject,
    property: string,
    interpolationCurve: {
        time: number,
        progress: number,
    }[]
) {
    let start = { value: object[property], time: Date.now() };
    let end = { value: object[property], time: Date.now() };
    
    Object.defineProperty(object, property, {
        get: () => {
            const time = end.time - start.time;
            let lower = interpolationCurve[0];
            let upper = interpolationCurve[0];

            for(const slice of interpolationCurve) {
                if(time > slice.time && slice.time > lower.time) lower = slice;
                if(time < slice.time && slice.time < upper.time) upper = slice;
            }

            const sliceTime = (time - lower.time) / (upper.time - lower.time);
            const ratio = lower.progress + sliceTime * (upper.progress - lower.progress);

            if(Number.isNaN(ratio)) return start.value;
            return end.value * ratio + start.value * (1 - ratio);
        },
        set: (value) => {
            // Don't lerp between edit requests sent in same frame
            if(Date.now() - end.time < 10) {
                end.value = value;
                return true;
            }
            start = { ...end };
            end = { value, time: Date.now() }
            return true;
        }
    });
}

export function BuildConstraint(name: string, args: Value[]): Constraint | void {
    if(name == 'min') return n => n >= args[0] ? n : args[0];
    if(name == 'max') return n => n <= args[0] ? n : args[0];
    if(name == 'ban') return n => args.includes(n) ? null : n;
    return I => I;
}