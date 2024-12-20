import { Client } from "./client";

export type Options = {
    tps?: number,
}

export type Value = string | number | boolean;

export type RawObject<T=any> = { [key: string]: T };