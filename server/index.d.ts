/// <reference types="ws" />
/// <reference types="node" />
declare module "src/types" {
    import { Client } from "src/client";
    export type Options = {
        tps?: number;
    };
    export type Events = {
        connect?: (client: Client) => void;
        disconnect?: (client: Client) => void;
    };
    export type Value = string | number | boolean;
    export type RawObject = {
        [key: string]: any;
    };
}
declare module "src/update" {
    import { RawObject } from "src/types";
    export class EditUpdate {
        clientUUID: string;
        path: string[];
        value: any;
        constructor(clientUUID: string, path: string[], value: any);
        raw(): RawObject;
    }
    export class ConnectionUpdate {
        clientUUID: string;
        publicData: RawObject;
        constructor(clientUUID: string, publicData: RawObject);
        raw(): RawObject;
    }
    export class InitializeUpdate {
        client: RawObject;
        constraintTable: RawObject;
        clients: RawObject;
        server: RawObject;
        constructor(client: RawObject, constraintTable: RawObject, clients: RawObject, serverData: RawObject);
        raw(): RawObject;
    }
    export type Update = EditUpdate | InitializeUpdate | ConnectionUpdate;
}
declare module "src/multyx" {
    import { Client } from "src/client";
    import { RawObject, Value } from "src/types";
    export class MultyxObject {
        data: {
            [key: string]: MultyxObject | MultyxValue;
        };
        propertyPath: string[];
        client: Client;
        constructor(object: RawObject, client: Client, propertyPath?: string[]);
        disable(): this;
        enable(): this;
        public(team?: MultyxTeam): this;
        /**
         * Check if property is in object
         */
        has(property: string): boolean;
        /**
         * Get the ClientValue object of a property
         */
        get(property: string): any;
        /**
         * Set the explicit value of the ClientValue object of a property
         * @example
         * ```js
         * // Server
         * multyx.on('reset', client => client.player.setValue('x', 5));
         *
         * // Client
         * client.player.x = 20 * Math.random();
         * multyx.send('reset');
         * console.log(client.player.x); // 5
         * ```
         */
        set(property: string, value: Value | RawObject | MultyxObject): false | this | {
            clients: Set<Client>;
        };
        /**
         * Get the explicit value of the ClientValue object of a property
         * @example
         * ```js
         * // Client
         * client.player.x = 9;
         *
         * // Server
         * console.log(client.player.getValue('x')); // 9
         * ```
         */
        getValue(property: string): string | number | boolean;
        parse(): RawObject;
        parsePublicized(team?: MultyxTeam): RawObject;
        buildConstraintTable(): RawObject;
        editPropertyPath(newPath: string[]): void;
    }
    export class MultyxValue {
        value: string | number | boolean;
        disabled: boolean;
        constraints: Map<string, {
            args: any[];
            func: (value: Value) => Value | null;
        }>;
        manualConstraints: ((value: Value) => Value | null)[];
        bannedValues: Set<Value>;
        private publicTeams;
        propertyPath: string[];
        client: Client;
        constructor(value: Value, client: Client, propertyPath: string[]);
        disable(): this;
        enable(): this;
        public(team?: MultyxTeam): void;
        isPublic(team?: MultyxTeam): boolean;
        get(): string | number | boolean;
        set(value: Value): false | {
            clients: Set<Client>;
        };
        buildConstraintTable(): RawObject;
        min: (value: Value, harsh?: boolean) => this;
        max: (value: Value, harsh?: boolean) => this;
        ban: (value: Value) => this;
        constrain: (func: (value: Value) => Value | null) => this;
    }
    export class MultyxTeam {
        clients: Set<Client>;
        publicData: Set<MultyxValue>;
        constructor(clients?: Set<Client> | Client[]);
        addClient(client: Client): void;
        parsePublicized(): Map<Client, RawObject>;
    }
    export const MultyxClients: MultyxTeam;
}
declare module "src/client" {
    import { MultyxObject, MultyxTeam } from "src/multyx";
    import { WebSocket } from "ws";
    import { RawObject } from "src/types";
    import { MultyxServer } from "src/index";
    export class Client {
        data: RawObject;
        shared: MultyxObject;
        teams: Set<MultyxTeam>;
        ws: WebSocket;
        server: MultyxServer;
        uuid: string;
        joinTime: number;
        constructor(ws: WebSocket, server: MultyxServer);
        /**
         * Create client-side representation of client object
         */
        parse(): RawObject;
    }
}
declare module "src/message" {
    import { Update } from "src/update";
    export default class Message {
        name: string;
        data: any;
        time: number;
        /**
         * Constructor for creating messages to send to client
         * @param name
         * @param data
         */
        constructor(name: string, data: any);
        static Native(updates: Update[]): string;
        static Create(name: string, data: any): string;
        static Parse(str: string): Message;
    }
}
declare module "src/utils" {
    import { RawObject } from "src/types";
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
    export function MergeRawObjects(target: RawObject, source: RawObject): RawObject;
    /**
     * Turn Map<any, any> into RawObject
     *
     * coolest mf piece of code ive written it looks so cool wtf
     * @param target Map to transform into object
     * @param key Map key to string transform function
     * @param value Map value to object value transform function
     * @returns Transformed object
     */
    export function MapToObject<K, V>(target: Map<K, V>, key?: (c: K) => string, value?: (v: V) => any): RawObject;
}
declare module "src/index" {
    import { Client } from "src/client";
    import { Update } from "src/update";
    import { MultyxValue, MultyxObject, MultyxTeam } from "src/multyx";
    import { Server } from 'http';
    import { Events, Options } from "src/types";
    export { Client, MultyxValue, MultyxObject, MultyxTeam };
    export class MultyxServer {
        serverData: {
            [key: string]: any;
        };
        tps: number;
        events: Events;
        all: MultyxTeam;
        updates: Map<Client, Update[]>;
        constructor(server: Server, options?: Options);
        on(event: keyof Events, callback: ((...args: any) => void)): void;
        private initializeClient;
        private parseNativeMessage;
        editUpdate(value: MultyxObject | MultyxValue, clients: Set<Client>): void;
        private addOperation;
        private sendUpdates;
    }
}
declare module "index" {
    import * as Multyx from "src/index";
    export default Multyx;
}
