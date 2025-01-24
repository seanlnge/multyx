export type Value = string | number | boolean;

export type RawObject<T=any> = { [key: string]: T };

export type Callback = (...args: any[]) => any;