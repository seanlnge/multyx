declare module "src/types" {
    export type Value = string | number | boolean;
    export type RawObject<T = any> = {
        [key: string]: T;
    };
    export type Callback = (...args: any[]) => any;
}
declare module "src/utils/objects" {
    import { RawObject } from "src/types";
    /**
     * @example
     * \`\`\`js
     * const a = { a: 3, b: { c: 4 } };
     * const b = { d: 1, b: { e: 2 } };
     *
     * const merged = MergeRawObjects({ ...a }, { ...b });
     * console.log(merged); // { a: 3, b: { c: 4, e: 2 }, d: 1 }
     * \`\`\`
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
declare module "src/messages/update" {
    import { RawObject } from "src/types";
    export interface EditUpdate {
        team: boolean;
        path: string[];
        value: any;
        instruction: 'edit';
    }
    export interface SelfUpdate {
        instruction: 'self';
        property: 'controller' | 'uuid' | 'constraint' | 'space';
        data: any;
    }
    export interface InputUpdate {
        instruction: 'input';
        input: string;
        data: any;
    }
    export interface ResponseUpdate {
        instruction: 'resp';
        name: string;
        response: any;
    }
    export interface ConnectionUpdate {
        instruction: 'conn';
        uuid: string;
        publicData: RawObject;
    }
    export interface DisconnectUpdate {
        instruction: 'dcon';
        clientUUID: string;
    }
    export interface InitializeUpdate {
        instruction: 'init';
        client: RawObject;
        tps: number;
        constraintTable: RawObject;
        clients: RawObject;
        teams: RawObject;
        space: string;
    }
    /**
     * Compresses update into a string
     * [instruction][specifier]:[data]
     * @param update
     * @returns Compressed update
     */
    export function CompressUpdate(update: Update): string | undefined;
    export function UncompressUpdate(str: string): EditUpdate | InputUpdate | ResponseUpdate | null | undefined;
    export type Update = EditUpdate | InputUpdate | SelfUpdate | ResponseUpdate | InitializeUpdate | ConnectionUpdate | DisconnectUpdate;
}
declare module "src/messages/message" {
    import { Update } from "src/messages/update";
    export default class Message {
        name: string;
        data: any;
        time: number;
        native: boolean;
        /**
         * Constructor for creating messages to send to client
         * @param name
         * @param data
         */
        private constructor();
        static Native(updates: Update[]): string;
        static Create(name: string, data: any): string;
        static Parse(str: string): Message | null;
    }
}
declare module "src/utils/native" {
    export const Parse: unique symbol;
    export const Get: unique symbol;
    export const Value: unique symbol;
    export const Edit: unique symbol;
    export const Send: unique symbol;
    export const Self: unique symbol;
    export const Build: unique symbol;
    export const Remove: unique symbol;
    export class EditWrapper {
        value: any;
        /**
         * Used when client is editing value
         * @param value Value to set
         */
        constructor(value: any);
    }
}
declare module "src/messages/event" {
    import { Client } from "../agents";
    import { Callback } from "src/types";
    export const Events: {
        Connect: symbol;
        Disconnect: symbol;
        Update: symbol;
        PostUpdate: symbol;
        Edit: symbol;
        Input: symbol;
        Any: symbol;
        Native: symbol;
        Custom: symbol;
    };
    export type EventName = typeof Events[keyof typeof Events] | string;
    export class Event {
        eventName: EventName;
        callback: Callback;
        saveHistory: boolean;
        history: {
            time: number;
            client: Client | undefined;
            data: any;
            result: any;
        }[];
        constructor(eventName: EventName, callback: Callback);
        call(client?: Client | undefined, data?: any): void;
        delete(): void;
    }
}
declare module "src/options" {
    import type { Server } from "http";
    import type { ServerOptions } from "ws";
    export type Options = {
        tps?: number;
        port?: number;
        server?: Server;
        removeDisconnectedClients?: boolean;
        respondOnFrame?: boolean;
        sendConnectionUpdates?: boolean;
        websocketOptions?: ServerOptions;
    };
    export const DefaultOptions: Options;
}
declare module "src/index" {
    import { WebSocket } from 'ws';
    import { Callback, RawObject } from "src/types";
    import { Client, Input, Controller, ControllerState, MultyxTeam } from './agents';
    import { MultyxItem, MultyxList, MultyxObject, MultyxValue } from './items';
    import { SelfUpdate, Update } from "src/messages/update";
    import { Event, EventName, Events } from "src/messages/event";
    import { Edit, Self, Build, Send, Remove } from "src/utils/native";
    import { Options } from "src/options";
    export { Client, Input, Controller, ControllerState, Events, MultyxValue, MultyxList, MultyxObject, MultyxItem, MultyxTeam, MultyxServer, Options, RawObject };
    class MultyxServer {
        tps: number;
        events: Map<EventName, Event[]>;
        all: MultyxTeam;
        updates: Map<Client, Update[]>;
        lastFrame: number;
        deltaTime: number;
        options: Options;
        ws: WeakMap<Client, WebSocket>;
        constructor(options?: Options | Callback, callback?: Callback);
        /**
         * Setup connection between server and client, including
         * sending client all initialization information, and relaying
         * public information to all other clients
         *
         * @param ws Websocket object from connection
         * @returns Client object
         */
        private connectionSetup;
        private parseCustomMessage;
        private parseNativeMessage;
        private parseEditUpdate;
        private addOperation;
        /**
         * Turn update list into smaller update list by combining data
         * from the same MultyxObject
         * @param updates List of updates to compress
         * @returns Compressed updates
         */
        private compressUpdates;
        /**
         * Send all updates in past frame to clients
         */
        private sendUpdates;
        /**
         * Create an EditUpdate event to send to list of clients
         * @param item MultyxItem to relay state of
         * @param clients Set of all clients to relay event to
         */
        [Edit](item: MultyxItem, clients: Set<Client>): void;
        /**
         * Create an EditUpdate event to remove an item from update
         * @param item MultyxItem to relay state of
         * @param clients Set of all clients to relay event to
         */
        [Remove](item: MultyxItem, clients: Set<Client>): void;
        /**
         * Create a SelfUpdate event to send to client
         * @param property Self property being updated
         */
        [Self](client: Client, property: SelfUpdate['property'], data: any): void;
        /**
         * Send message to client
         * @param client Client to send to
         * @param message Message to send
         */
        [Build](client: Client, message: string): void;
        /**
         * Create a ResponseUpdate to respond to client
         * @param client Client to send response to
         * @param eventName Name of event responding to
         * @param response Response
         */
        [Send](client: Client, eventName: string, response: any): void;
        /**
         * Create an event listener for any MultyxEvents
         * @param event
         * @param callback
         * @returns Event listener object
         */
        on(event: EventName, callback: (client: Client, data: any) => any): Event;
        /**
         * Apply a function to all connected clients, and all clients that will ever be connected
         * @param callback
         */
        forAll(callback: Callback): void;
    }
}
declare module "index" {
    export * from "src/index";
}
declare module "src/utils/uuid" {
    /**
     * Generate a unique identifier across Multyx ecosystem
     * @param length Length of UUID
     * @param radix Base number to use for UUID characters
     * @returns
     */
    export function GenerateUUID(length?: number, radix?: number): string;
    /**
     * Add a UUID to the Multyx ecosystem global set
     * @param uuid UUID to add to set
     * @returns True if success, false if UUID already exists in set
     */
    export function AddUUID(uuid: string): boolean;
}
declare module "src/agents/controller" {
    import { InputUpdate } from "src/messages/update";
    import { Parse } from "src/utils/native";
    import type Client from "src/agents/client";
    export enum Input {
        MouseMove = "mousemove",
        MouseDown = "mousedown",
        MouseUp = "mouseup",
        KeyDown = "keydown",
        KeyHold = "keyhold",
        KeyUp = "keyup",
        KeyPress = "keypress",
        Shift = "Shift",
        Alt = "Alt",
        Tab = "Tab",
        Control = "Control",
        Enter = "Enter",
        Escape = "Escape",
        Delete = "Delete",
        Space = "Space",
        CapsLock = "CapsLock",
        LeftShift = "ShiftLeft",
        RightShift = "ShiftRight",
        LeftControl = "ControlLeft",
        RightControl = "ControlRight",
        LeftAlt = "AltLeft",
        RightAlt = "AltRight",
        UpArrow = "ArrowUp",
        DownArrow = "ArrowDown",
        LeftArrow = "ArrowLeft",
        RightArrow = "ArrowRight"
    }
    export type ControllerState = {
        keys: {
            [key: string]: boolean;
        };
        mouse: {
            x: number;
            y: number;
            down: boolean;
        };
    };
    export class Controller {
        client: Client;
        state: ControllerState;
        listening: Set<string>;
        events: Map<string, ((state: ControllerState) => void)[]>;
        constructor(client: Client);
        /**
         * Listen to specific input channel from user
         * @param input Input to listen for; If type \`string\`, client listens for keyboard event code \`input\`
         * @example
         * \`\`\`js
         * client.controller.listenTo(["a", "d", Input.Shift, Input.MouseMove], (state) => {
         *     console.log("Client did an input");
         *     console.log(state.mouse.x, state.mouse.y);
         *
         *     if(state.keys["a"] && state.keys["d"]) {
         *         console.log("bro is NOT moving crying emoji skull emoji");
         *     }
         * });
         * \`\`\`
         */
        listenTo(input: string | string[], callback?: (state: ControllerState) => void): void;
        /**
         * Parse an input update from client
         * @param msg Message containing input data
         */
        [Parse](update: InputUpdate): void;
    }
}
declare module "src/agents/team" {
    import { MultyxServer } from "..";
    import { RawObject } from "src/types";
    import { Get } from "src/utils/native";
    import { MultyxObject, MultyxItem } from "../items";
    import type Client from "src/agents/client";
    export default class MultyxTeam {
        private _clients;
        private public;
        self: MultyxObject;
        server: MultyxServer;
        uuid: string;
        get clients(): Client[];
        /**
         * Creates a group of clients sharing public data
         * @param clients List of clients to add to team
         * @returns MultyxTeam object
         */
        constructor(name: string, clients?: Set<Client> | Client[]);
        /**
         * Send an event to all clients on team
         * @param eventName Name of client event
         * @param data Data to send
         */
        send(eventName: string, data: any): void;
        /**
         * Retrieve a client object in the team
         * @param uuid UUID of client to retrieve
         * @returns Client if exists in team, else null
         */
        getClient(uuid: string): Client | null;
        /**
         * Add a client into the team
         * @param client Client object to add to team
         */
        addClient(client: Client): void;
        /**
         * Remove a client from the team
         * @param client Client object to remove from team
         */
        removeClient(client: Client): void;
        /**
         * Make item visible to team
         * @param item MultyxItem to make visible to all clients in team
         * @returns Same MultyxTeam object
         */
        addPublic(item: MultyxItem): this;
        /**
         * Remove item visibility from team
         * @param item MultyxItem to remove visibility of
         * @returns Same MultyxTeam object
         */
        removePublic(item: MultyxItem): this;
        /**
         * Get publicized data of all clients in team
         * @returns Map between client and publicized data
         */
        [Get](): Map<Client, RawObject>;
    }
}
declare module "src/agents/client" {
    import type { RawObject } from "src/types";
    import type { MultyxServer } from "src/index";
    import { MultyxObject } from "../items";
    import { Parse } from "src/utils/native";
    import { Controller, ControllerState } from "src/agents/controller";
    import type MultyxTeam from "src/agents/team";
    export default class Client {
        self: MultyxObject;
        controller: Controller;
        teams: Set<MultyxTeam>;
        server: MultyxServer;
        uuid: string;
        warnings: number;
        networkIssues: number;
        updateSize: number;
        joinTime: number;
        clients: Client[];
        onUpdate: (deltaTime: number, controllerState: ControllerState) => void;
        private space;
        constructor(server: MultyxServer);
        on(eventName: string, callback: (data: any) => any): void;
        send(eventName: string, data?: any): void;
        await(eventName: string, data?: any): Promise<unknown>;
        /**
         * Set the space of the client
         * @param space
         */
        setSpace(space: string): void;
        /**
         * Get the space of the client
         */
        getSpace(): string;
        /**
         * Create client-side representation of client object
         */
        [Parse](): RawObject;
    }
}
declare module "src/agents/index" {
    import Client from "src/agents/client";
    import MultyxTeam from "src/agents/team";
    import { Controller, ControllerState, Input } from "src/agents/controller";
    type Agent = Client | MultyxTeam;
    export { Agent, Client, Controller, ControllerState, Input, MultyxTeam };
}
declare module "src/items/router" {
    export default function MultyxItemRouter(data: any): any;
}
declare module "src/items/list" {
    import type { Agent, MultyxTeam } from "../agents";
    import { RawObject, Value } from "src/types";
    import { MultyxItem } from ".";
    import { Build, Get, Self } from "src/utils/native";
    export default class MultyxList<T = any> {
        data: MultyxItem<T>[];
        propertyPath: string[];
        agent: Agent;
        disabled: boolean;
        relayed: boolean;
        allowItemChange: boolean;
        allowItemAddition: boolean;
        allowItemDeletion: boolean;
        private publicTeams;
        private writeCallbacks;
        [key: string]: any;
        get value(): any[];
        get relayedValue(): any[];
        get length(): number;
        set length(length: number);
        private sendShiftOperation;
        /**
         * Create a MultyxItem representation of an array
         * @param list Array to turn into MultyxObject
         * @param agent Client or MultyxTeam hosting this MultyxItem
         * @param propertyPath Entire path from agent to this MultyxList
         * @returns MultyxList
         */
        constructor(list: (RawObject | Value | MultyxItem<T>)[], agent: Agent, propertyPath?: string[]);
        disable(): this;
        enable(): this;
        relay(): this;
        unrelay(): this;
        /**
         * Publicize MultyxValue from specific MultyxTeam
         * @param team MultyxTeam to share MultyxValue to
         * @returns Same MultyxValue
         */
        addPublic(team: MultyxTeam): this;
        /**
         * Privitize MultyxValue from specific MultyxTeam
         * @param team MultyxTeam to hide MultyxValue from
         * @returns Same MultyxValue
         */
        removePublic(team: MultyxTeam): this;
        has(index: number): boolean;
        /**
         * Get the value of a property
         */
        get(property: number | string[]): MultyxItem | undefined;
        /**
         * Set the value of the MultyxValue object of a property
         * @example
         * \`\`\`js
         * // Server
         * multyx.on('reset', client => client.player.set('x', 5));
         *
         * // Client
         * client.position[1] = 20 * Math.random();
         * multyx.send('reset');
         * console.log(client.position[1]); // 5
         * \`\`\`
         */
        set(index: string | number, value: any): this | false;
        delete(index: string | number): this;
        await(index: number): Promise<any>;
        /**
         * Create a callback that gets called whenever the object is edited
         * @param index Index to listen for writes on
         * @param callback Function to call whenever object is edited
         * @returns Event object representing write callback
         */
        onWrite(index: number, callback: (v: any) => void): any;
        /**
         * Get all properties in list publicized to specific team
         * @param team MultyxTeam to get public data for
         * @returns Raw object
         */
        [Get](team: MultyxTeam): RawObject;
        /**
         * Build a constraint table
         * @returns Constraint table
         */
        [Build](): RawObject[];
        [Self](newPath: string[]): void;
        push(...items: any[]): number;
        pop(): MultyxItem<T> | undefined;
        unshift(...items: any[]): number;
        shift(): any;
        splice(start: number, deleteCount?: number, ...items: any[]): MultyxItem<T>[];
        setSplice(start: number, deleteCount?: number, ...items: any[]): MultyxItem<T>[];
        slice(start?: number, end?: number): MultyxItem<T>[];
        setSlice(start?: number, end?: number): this;
        filter(predicate: (value: any, index: number, array: MultyxList) => boolean): boolean[];
        setFilter(predicate: (value: any, index: number, array: MultyxList) => boolean): this;
        map(callbackfn: (value: any, index: number, array: MultyxList) => any): any[];
        setMap(callbackfn: (value: any, index: number, array: MultyxList) => any): this;
        flat(): any[];
        setFlat(): void;
        reduce(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxList) => any, startingAccumulator: any): any;
        reduceRight(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxList) => any, startingAccumulator: any): any;
        reverse(): this;
        forEach(callbackfn: (value: any, index: number, array: MultyxList) => void): void;
        every(predicate: (value: any, index: number, array: MultyxList) => boolean): boolean;
        some(predicate: (value: any, index: number, array: MultyxList) => boolean): boolean;
        find(predicate: (value: any, index: number, array: MultyxList) => boolean): any;
        findIndex(predicate: (value: any, index: number, array: MultyxList) => boolean): number;
        entries(): [any, any][];
        keys(): any[];
        values(): any[];
        [Symbol.iterator](): Iterator<MultyxItem<T>>;
        toString: () => string;
        valueOf: () => any[];
        [Symbol.toPrimitive]: () => any[];
    }
}
declare module "src/items/value" {
    import type { Agent, MultyxTeam } from "../agents";
    import { RawObject, Value } from "src/types";
    import { Build, Get, Send, Self } from "src/utils/native";
    export default class MultyxValue<T = Value | undefined> {
        value: T;
        propertyPath: string[];
        agent: Agent;
        private publicAgents;
        disabled: boolean;
        relayed: boolean;
        constraints: Map<string, {
            args: any[];
            func: (value: T) => T | null;
        }>;
        manualConstraints: ((value: T) => T | null)[];
        bannedValues: Set<T>;
        get relayedValue(): T | undefined;
        /**
         * Create a MultyxItem representation of a primitive
         * @param value Value to turn into MultyxItem
         * @param agent Client or MultyxTeam hosting this MultyxItem
         * @param propertyPath Entire path leading from agent to root
         */
        constructor(value: T | MultyxValue<T>, agent: Agent, propertyPath: string[]);
        set(value: T | MultyxValue<T>): boolean;
        /**
         * Send an EditUpdate
         * @param agent Agent to send EditUpdate to, if undefined, send to all public agents
         */
        [Send](agent?: Agent): void;
        /**
         * Send a ConstraintUpdate
         */
        [Get](name: string, args: any[]): void;
        /**
         * Build a constraint table
         * @returns Constraint table
         */
        [Build](): RawObject;
        /**
         * Edit the property path
         * @param newPath New property path to set value at
         */
        [Self](newPath: string[], relay?: boolean): void;
        /**
         * Set a minimum value for this property
         * If requested value is lower, the accepted value will be the minimum value
         * @param value Minimum value to allow
         * @returns Same multyx object
         */
        min: (value: T | MultyxValue<T>) => this;
        /**
         * Set a maximum value for this property
         * If requested value is higher, the accepted value will be the maximum value
         * @param value Maximum value to allow
         * @returns Same multyx object
         */
        max: (value: T | MultyxValue<T>) => this;
        /**
         * Only allow integer values for this property
         * If float is passed, the accepted value will be the floored value
         */
        int: () => this;
        /**
         * Disallow this property to have specified value
         * Will revert to previous value if requested value is banned
         * @param value Value to ban
         * @returns Same Multyx object
         */
        ban: (value: T | MultyxValue<T>) => this;
        /**
         * Create custom constraint for value
         * Only constrained server-side
         * @param fn Function accepting requested value and returning either null or accepted value. If this function returns null, the value will not be accepted and the change reverted.
         * @returns Same MultyxValue
         */
        constrain: (fn: ((value: any) => T | null)) => this;
        /**
         * Disable setting value of MultyxValue
         * @returns Same MultyxValue
         */
        disable(): this;
        /**
         * Enable setting value of MultyxValue
         * @returns Same MultyxValue
         */
        enable(): this;
        relay(): this;
        unrelay(): this;
        /**
         * Publicize MultyxValue from specific MultyxTeam
         * @param team MultyxTeam to share MultyxValue to
         * @returns Same MultyxValue
         */
        addPublic(team: MultyxTeam): this;
        /**
         * Privitize MultyxValue from specific MultyxTeam
         * @param team MultyxTeam to hide MultyxValue from
         * @returns Same MultyxValue
         */
        removePublic(team: MultyxTeam): this;
        /**
         * Check if MultyxValue is visible to specific MultyxTeam
         * @param team MultyxTeam to check for visibility from
         * @returns Boolean, true if MultyxValue is visible to team, false otherwise
         */
        isPublic(team: MultyxTeam): boolean;
        toString: () => string;
        valueOf: () => T;
        [Symbol.toPrimitive]: () => T;
    }
}
declare module "src/items/object" {
    import { MultyxItem, MultyxObjectData } from ".";
    import { RawObject } from "src/types";
    import { Get, Build, Self } from "src/utils/native";
    import type { Agent, MultyxTeam } from "../agents";
    export default interface MultyxObject<T extends object = object> {
        [key: string]: any;
    }
    export default class MultyxObject<T extends object = object> {
        data: MultyxObjectData<T>;
        propertyPath: string[];
        agent: Agent;
        disabled: boolean;
        relayed: boolean;
        private publicTeams;
        /**
         * Turn MultyxObject back into regular object
         * @returns RawObject mirroring shape and values of MultyxObject
         */
        get value(): RawObject;
        /**
         * Get the value of MultyxObject that is relayed to public agents
         * @returns RawObject mirroring shape and values of relayed MultyxObject
         */
        get relayedValue(): RawObject;
        /**
         * Create a MultyxItem representation of an object
         * @param object Object to turn into MultyxItem
         * @param agent Client or MultyxTeam hosting this MultyxItem
         * @param propertyPath Entire path from agent to this MultyxObject
         * @returns MultyxObject
         */
        constructor(object: RawObject | MultyxObject, agent: Agent, propertyPath?: string[]);
        disable(): this;
        enable(): this;
        relay(): this;
        unrelay(): this;
        /**
         * Publicize MultyxValue from specific MultyxTeam
         * @param team MultyxTeam to share MultyxValue to
         * @returns Same MultyxValue
         */
        addPublic(team: MultyxTeam): this;
        /**
         * Privitize MultyxValue from specific MultyxTeam
         * @param team MultyxTeam to hide MultyxValue from
         * @returns Same MultyxValue
         */
        removePublic(team: MultyxTeam): this;
        /**
         * Check if property is in object
         */
        has(property: string): boolean;
        /**
         * Get the value of a property
         */
        get(property: string | string[]): MultyxItem | undefined;
        /**
         * Set the explicit value of the property
         * @example
         * \`\`\`js
         * // Server
         * multyx.on('reset', client => client.player.set('x', 5));
         *
         * // Client
         * client.player.x = 20 * Math.random();
         * multyx.send('reset');
         * console.log(client.player.x); // 5
         * \`\`\`
         */
        set(property: string, value: any): MultyxObject | false;
        /**
         * Delete property from MultyxObject
         * @param property Name of property to delete
         * @returns False if deletion failed, same MultyxObject otherwise
         */
        delete(property: string): this;
        /**
         * Wait for a property in object to be defined
         * @param property Name of property in object to wait for
         * @returns Promise that resolves once object[property] is defined
         */
        await(property: string): Promise<any>;
        /**
         * Create a callback that gets called whenever the object is edited
         * @param property Property to listen for writes on
         * @param callback Function to call whenever object is edited
         * @returns Event object representing write callback
         */
        onWrite(property: string, callback: (v: any) => void): any;
        /**
         * Get all properties in object publicized to specific team
         * @param team MultyxTeam to get public data for
         * @returns Raw object
         */
        [Get](team: MultyxTeam): RawObject;
        /**
         * Build a constraint table
         * @returns Constraint table
         */
        [Build](): RawObject;
        /**
         * Edit the property path of MultyxObject and any children
         * @param newPath New property path to take
         */
        [Self](newPath: string[]): void;
        entries(): [string, any][];
        keys(): string[];
        values(): any[];
        toString: () => string;
        valueOf: () => RawObject;
        [Symbol.toPrimitive]: () => RawObject;
    }
}
declare module "src/items/index" {
    import MultyxList from "src/items/list";
    import MultyxObject from "src/items/object";
    import MultyxValue from "src/items/value";
    function IsMultyxItem(data: any): data is MultyxItem;
    type MultyxItem<T = any> = T extends any[] ? MultyxList<T[number]> & {
        [K in keyof T]: MultyxItem<T[K]>;
    } : T extends object ? MultyxObject<T> & {
        [K in keyof T]: MultyxItem<T[K]>;
    } : T extends undefined ? MultyxValue<T> : MultyxValue<T>;
    type MultyxObjectData<T extends object> = {
        [K in keyof T]: MultyxItem<T[K]>;
    } & {
        [key: string]: MultyxItem<any>;
    };
    export { IsMultyxItem, MultyxList, MultyxObject, MultyxValue, MultyxItem, MultyxObjectData };
}
//# sourceMappingURL=bundle.d.ts.map