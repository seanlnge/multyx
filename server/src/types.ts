import { Client } from "./client";

export type Options = {
    tps?: number,
}

export type Events = {
    connect?: (client: Client) => void,
    disconnect?: (client: Client) => void,
}

export type Value = string | number | boolean;

export type RawObject<T=any> = { [key: string]: T };