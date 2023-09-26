export type RawObject<T=any> = { [key: string]: T };
export type Value = string | number | boolean;
export type Constraint = (n: Value) => Value | null;

export type EditUpdate = {
    instruction: 'edit',
    path: string[],
    value: Value
};

export type InputUpdate = {
    instruction: 'input',
    input: string,
    data?: RawObject<Value>
}

export type Update = EditUpdate | InputUpdate;