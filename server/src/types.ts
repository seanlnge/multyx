import type { ServerOptions } from "ws";

export type Options = {
    tps?: number,
    websocketOptions?: ServerOptions
}
export const DefaultOptions: Options = {
    tps: 20,
    websocketOptions: {
        perMessageDeflate: true
    }
}

export type Value = string | number | boolean;

export type RawObject<T=any> = { [key: string]: T };