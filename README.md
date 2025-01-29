# Multyx

***

## What is Multyx?

Multyx is a framework designed to simplify the creation of multiplayer browser games by addressing the complexities of managing server-client communication, shared state, and input handling. It provides developers with tools to efficiently synchronize data between the server and clients, enforce security and validation, and streamline the handling of user inputs and interactions. By abstracting many of the tedious aspects of multiplayer game development, Multyx enables developers of all skill levels to build robust, functional, and secure multiplayer experiences with minimal friction.

## Why Multyx?

Focused on ease of use and a good developer experience, Multyx turns the difficulty and complexity of making a multiplayer browser game into a simpler process that anyone can jump into.

### Shared Data between Client and Server

Being able to communicate changes in data is necessary for a functional multiplayer game, but due to needing server-side verification, consistency across websocket endpoints, and a lack of type validation, it can be difficult to bridge the gap between the client and server data transfer. Multyx streamlines this process by including a shared state between the server and client, along with

* Control over which data is public to the client
* The ability to constrain, disable, and verify data changed by the client
* Client knowledge of constraints to reduce redundancies
* The ability to allow or disallow the client to alter data
* Consistency in data between the client and the server
* The ability to share a public state between groups of clients

With the use of MultyxObjects, Multyx can integrate seamlessly into projects, letting changes in data be relayed across both endpoints without the need for any extra code to be written.

### Input Controller

Client interactivity is a necessity in any game, but with it being hard to standardize mouse position across varying screen sizes, and manage the state of inputs, it can be tricky to implement an input system. Multyx allows you to

* Pick which client inputs to listen to from the server
* Map the client's mouse location to canvas coordinates
* View the state of inputs from both the server and client
* Add event listeners on the server for client inputs

### Helpful Functionalities

Building a functional, efficient, and secure multiplayer game is notoriously a tedious process, with each project having its own needs. Multyx simplifies this process by offering a variety of helpful functionalities such as

* Predictive and non-predictive interpolation between values
* Teams to manage public state across groups of clients
* Options for changing websocket connection and runtime settings

***

## Overview

Its generally easier to understand through examples and actually looking at the code, so this section gives a slightly more in-depth understanding of what Multyx does.

### Shared State

Having a shared read/write state is easily the most important aspect of Multyx, so a lot is put into making it seamless and worthwhile. Shared state in Multyx is made through the [`MultyxItem`](#multyxitem) type, which includes the classes [`MultyxObject`](#multyxobject), [`MultyxList`](#multyxlist), and [`MultyxValue`](#multyxvalue). These are Multyx's shared-state versions of objects, arrays, and primitives, respectively. Each of these acts like their original counterpart, for instance:

```js
client.self.object = {
    x: 3, y: 2, z: 1
};
console.log(client.self.object.z); // outputs 1

client.self.array = ["fizz", "buzz", "bog"]; // MultyxList
client.self.array[3] = "asdf"; // ["fizz", "buzz", "bog", "asdf"]
client.self.array.splice(2, 1); // ["fizz", "buzz", "asdf"]

client.self.y = client.self.x + 3; // no errors
```

However, they also have their own properties and methods.

```js
// server.js
client.self.x = 3;
client.self.x.min(-10).max(10);

client.self.array.allowItemAddition = false;

client.self.addPublic(Multyx.all);
```

The purpose of having these MultyxItems is that when the value is changed, Multyx relays that change to any clients that should see it.

Along with special objects on the server side, any shared data on the client side sits in a [`MultyxClientItem`](#multyxclientitem).

These are similar to the server-side [`MultyxItem`](#multyxitem) in the sense that any changes get relayed to the server to process, but they do not have the same properties or methods. Rather, they have methods that would be helpful to client prediction.

```js
// client.js
Multyx.self.x = 9;

Multyx.clients.forAll(client => {
    client.x.Lerp();
    client.y.Lerp();
    client.timeAlive.PredictiveLerp();
});
```

***

### Teams and Clients

When a [`MultyxItem`](#multyxitem) gets changed, the Multyx server needs to know which clients to send the information to, along with which clients have which permissions. This is all handled through the [`MultyxTeam`](#multyxteam) class.

A [`MultyxTeam`](#multyxteam) is at its core a list of [`Client`](#client) classes representing all clients that are part of that team, along with a [`MultyxObject`](#multyxobject) describing the shared data of that team. This [`MultyxObject`](#multyxobject) is public to all clients that are within the team, and by default has the ability to be edited by any [`Client`](#client) in the team, though this can be disabled.

```js
// server.js
const players = new MultyxTeam('players');
players.self.messages = ["hello world"];

multyx.on('join game', (client, name) => {
    client.self.name = name;
    players.addClient(client);
    players.self.messages.push(name + ' just joined');

    return 'success!';
});
```

```js
// client.js
console.log(multyx.teams.players.messages); // Error: "messages" doesn't exist on undefined

const joinStatus = await multyx.send('join game', 'player1');

console.log(joinStatus); // success!
console.log(multyx.teams.players.messages); // ["hello world", "player1 just joined"]
```

In Multyx, clients do not interact with each other. The [`MultyxTeam`](#multyxteam) class is the only way to share state between clients, as Client1 cannot edit the state of Client2. There is a difference, however, between being able to edit state, and being able to view it. This is achieved by making a [`MultyxItem`](#multyxitem) public.

Although clients are only able to edit themselves and any teams they are in, they are able to view any client data made public to a team that they are in.

```js
// server.js
import Multyx from 'multyx';

const multyx = new Multyx.MultyxServer();

multyx.on(Multyx.Events.Connect, client => {
    client.self.role = 'imposter';
    client.self.x = 100;
    client.self.y = 300;
    client.self.x.addPublic(multyx.all);
    client.self.y.addPublic(multyx.all);
});
```

```js
// client.js
const multyx = new Multyx();

multyx.on(multyx.Start, () => {
    for(const uuid in multyx.all) {
        console.log(multyx.clients[uuid]); // { x: 100, y: 300 }
        console.log(multyx.clients[uuid].role); // undefined 
    }
});
```

Using the `multyx.all` team that gets provided natively by the MultyxServer class, clients can share data to anyone connected to the server.

***

## Server-Side Documentation

***

```js
// server.js
import Multyx from 'multyx';
```

```js
// multyx/index.ts
export {
    Client,
    Input,
    Controller,
    ControllerState,
    Events,

    MultyxValue,
    MultyxList,
    MultyxObject,
    MultyxTeam,
    MultyxServer,

    Options,
    RawObject
};
```

***

### MultyxServer

A MultyxServer is initialized as follows.

```js
const multyx = new Multyx.MultyxServer(options?: Multyx.Options, callback?: () => void);
```

Initializing a MultyxServer creates a WebsocketServer using the node 'ws' module.

```ts
export type Options = {
    tps?: number,
    port?: number,
    server?: Server,
    removeDisconnectedClients?: boolean,
    respondOnFrame?: boolean,
    sendConnectionUpdates?: boolean,
    websocketOptions?: ServerOptions,
};

export const DefaultOptions: Options = {
    tps: 10,
    port: 443,
    removeDisconnectedClients: true,
    respondOnFrame: true,
    sendConnectionUpdates: true,
    websocketOptions: {
        perMessageDeflate: false // Often causes backpressure on client
    },
};
```

#### `Options.tps`

Number of times per second to relay updates to clients. Utilizes NanoTimer to precisely loop update sending every 1/tps seconds.

#### `Options.port`

Port to start WebsocketServer from, defaults to 443.

#### `Options.server`

Server to start WebsocketServer on. Will override the Options.port argument if included.

#### `Options.removeDisconnectedClients`

If true, disconnected clients will be removed from any MultyxTeam they are part of. If false, disconnected clients will remain in any MultyxTeam. All clients will still receive a DisconnectionUpdate. It is recommended to keep this set to true, as retaining the disconnected clients can lead to memory leaks if the server is running for long enough.

#### `Options.respondOnFrame`

If true, responses to manual Websocket events such as `const a = await Multyx.send();` will be added to the update queue and sent in frame with the rest of the updates. If false, responses will be immediately sent after processing. False not recommended unless there is a use-case, since updates will not have been relayed to the client.

```js
// server.js
const multyx = new MultyxServer({ respondOnFrame: false });
multyx.on('setBlue', client => client.self.color = 'blue');
```

```js
// client.js
await multyx.send('setBlue');
console.log(multyx.self.color); // undefined
```

#### `Options.sendConnectionUpdates`

If true, client connection and client disconnection will send an update to all clients. If false, client connection or disconnection is hidden.

#### `Options.websocketOptions`

List of server options to be dropped directly into the WebsocketServer constructor parameter. If port or server is defined in websocketOptions, `Options.port` or `Options.server` will be overridden.

#### `MultyxServer.on(event: EventName, callback): Event`

Create an event listener for any Multyx.Events or manual events. Event name can be type defined by `Multyx.Events` for event listeners on native Multyx processes, or string for event listeners on custom events sent by client. The callback will have 2 arguments passed: the [`Client`](#client) object, and any extra data specific to the event. If event is a custom event, the second argument will be passed from the client.

#### `MultyxServer.forAll(callback: (client: Client) => void)`

Apply a callback function to any connected clients, along with any clients who will connect in the future.

***

### Events

This is the list of all events for native Multyx processes.

```ts
export const Events = {
    Connect: Symbol('connect'),       // new client connects
    Disconnect: Symbol('disconnect'), // client disconnects
    Update: Symbol('update'),         // before each frame
    PostUpdate: Symbol('postupdate'), // after each frame
    Edit: Symbol('edit'),             // MultyxItem edited by client
    Input: Symbol('input'),           // client applies an input being listened to
    Any: Symbol('any'),               // any other event gets called
    Native: Symbol('native'),         // any native event gets called
    Custom: Symbol('custom')          // any custom event gets called
};

export type EventName = typeof Events[keyof typeof Events] | string;
```

### Event

Event is the object that gets returned from `MultyxServer.on`. It has some methods such as deleting itself along with a history of previous times the event has been called.

```ts
export class Event {
    eventName: string;

    callback: (client: Client | undefined, data: any) => any;
    history: { time: number, client: Client | undefined, data: any, result: any }[];
    
    public call(client: Client | undefined = undefined, data: any = {}) {}
    public delete() {}
}
```

#### `Event.eventName`

Name of the event being called.

#### `Event.delete()`

Delete the event listener. The previous callback function will not be called again even if the Event occurs.

#### `Event.history`

View the history of event listener calls, including the time, the client it relates to, the data sent, and the result that the event listener callback returned.

#### `Event.call()`

Simulate a call of the event using a client and some data. I don't know why you would ever use this.

***

### MultyxItem

A `MultyxItem` is the base of shared state in Multyx. A `MultyxItem` is merely a union type between the following, [`MultyxValue`](#multyxvalue), [`MultyxObject`](#multyxobject), and [`MultyxList`](#multyxlist). When a property is changed, deleted, or set inside a `MultyxItem`, that change gets relayed to all clients that have been provided visibility.

Any assignments to a `MultyxItem` or the creation of a child on a `MultyxItem`, such as setting `client.self.position = { x: 3, y: 2 };` will turn the value of the assignment into a `MultyxItem` itself.

MultyxItem objects cannot be directly created through the server-side code, as they require an owner and references to the MultyxServer. They do, however, exist on the `Client.self` or `MultyxTeam.self` properties.

#### `MultyxItem.value`

The original representation of the MultyxItem, or the MultyxItem's respective primitive, object, or array.

```js
// server.js
team.self.position = { x: 30, y: 100 };

console.log(team.self.position); // MultyxObject { x: 30, y: 100 }
console.log(team.self.position.value); // { x: 30, y: 100 }
```

#### `MultyxItem.disable()`

Disable the MultyxItem and any of its children from being edited by the client.

Returns same MultyxItem

#### `MultyxItem.enable()`

Allow the MultyxItem and any of its children to be edited by the client.

Returns same MultyxItem

#### `MultyxItem.disabled`

Boolean representing whether or not the MultyxItem is disabled, or able to be edited by the client.

#### `MultyxItem.relay()`

Relay any changes on the value of this MultyxItem to the client, along with any other public clients able to view it. Calling this after a client connection has already been established can be memory-inefficient, as this MultyxItem along with any children will all relay their values along with their constraints.

Returns same MultyxItem

#### `MultyxItem.unrelay()`

Stop sending any changes on the value of this MultyxItem to the client, along with any other public clients able to view it. This does not change whether or not the client can edit or view this MultyxItem, and the Multyx server will still send the value of the MultyxItem to the agent along with any public clients on MultyxItem instantiation.

Returns same MultyxItem

#### `MultyxItem.relayed`

Boolean representing whether or not changes in the value of the MultyxItem is being relayed to the client and any other public clients.

#### `MultyxItem.removePublic(team: MultyxTeam)`

Hide the MultyxItem from a specified team. If clients on that team have visibility of the MultyxItem through another team, this does not hide the MultyxItem from those clients.

Returns same MultyxItem

#### `MultyxItem.addPublic(team: MultyxTeam)`

Make the MultyxItem visible to all clients on a specified MultyxTeam. This does not allow clients of the MultyxTeam to be able to edit the MultyxItem, but allows them to view the data inside the MultyxItem.

Returns same MultyxItem

#### `MultyxItem.isPublic(team: MultyxTeam)`

Returns whether or not the MultyxItem is visible to a specified MultyxTeam.

#### `MultyxItem.agent`

The agent, Client or MultyxTeam, that is the sole editor of this MultyxItem. This agent has the ability to change, alter, delete, or set any properties of this MultyxItem, granted the server allows it. If the agent is a team, any client on that team has that same ability.

#### `MultyxItem.propertyPath`

An array describing the path from head to tail of this MultyxItem.

```js
// server.js
client.self = {
    inventory: [{ name: 'apple' }]
};

const apple = client.self.inventory[0].name;
console.log(apple.propertyPath); // ['ac942ed2', 'inventory', '0', 'name']
```

***

### MultyxValue

A `MultyxValue` is the [`MultyxItem`](#multyxitem) representation of primitive values, which includes strings, numbers, and booleans. These are the fundamental blocks of MultyxItems, which [`MultyxObject`](#multyxobject) and [`MultyxList`](#multyxlist) classes are made up of.

#### `MultyxValue.set(value: Value | MultyxValue)`

Set the value of the MultyxValue. This will run the requested value through all of the constraints and, if accepted, will relay the change to any clients with visibility.

This generally doesn't need to be used, since the value of MultyxValue can be set explicitly with native operators.

Returns boolean representing success of operation.

```js
// server.js
client.self.x = 3;    // does the same thing as below
client.self.x.set(3); // does the same thing as above
```

#### `MultyxValue.min(value: Value | MultyxValue)`

Constrain the value of MultyxValue to have a minimum of `value`. Will relay a change to the client describing the new minimum value.

Returns same MultyxValue

#### `MultyxValue.max(value: Value | MultyxValue)`

Constrain the value of MultyxValue to have a maximum of `value`. Will relay a change to the client describing the new maximum value.

Returns same MultyxValue

#### `MultyxValue.ban(value: Value | MultyxValue)`

Disallow MultyxValue to have a specified value. Will revert to previous value if requested value is banned.

Returns same MultyxValue

#### `MultyxValue.constrain(fn: ((value: any) => Value | null))`

Create a custom constraint on MultyxValue. This will only be constrained server-side, since code should not be transmitted over network, meaning that there isn't client prediction of this constraint.

The parameter takes in a function that takes in the requested value and returns either null or an accepted value. If this function returns null, the value will not be accepted and the change will be reverted.

Returns same MultyxValue

#### `MultyxValue.constraints`

A Map object containing the list of constraints placed onto the MultyxValue, excluding any custom ones. The key of this map is the name of the constraint, and the value of this map is an object containing the arguments of the constraint along with the constraint function.

```js
// server.js
client.self.x.min(-100);

console.log(client.self.x.constraints);
/* 
    Map {
        'min': {
            args: [-100],
            func: n => n >= value ? n : value
        }
    }
*/
```

#### `MultyxValue.manualConstraints`

An array containing all custom constraint functions placed onto the MultyxValue.

#### `MultyxValue.bannedValues`

A Set object containing the list of all banned values of this MultyxValue

***

### MultyxObject

A `MultyxObject` is the [`MultyxItem`](#multyxitem) representation of JavaScript objects, or key-value pairs. These consist of strings representing properties of the original object, corresponding to MultyxItem objects representing the values of the original object. The original object is the JavaScript object that MultyxObject is mirroring. These can be nested arbitrarily deep, and child elements can host any type of [`MultyxItem`](#multyxitem).

Generally, within a `MultyxObject`, any changes to the visibility of editability of the object, such as `.disable()` or `.addPublic()` will propogate throughout all children, overwriting any settings that they had prior.

#### `MultyxObject.has(property: string): boolean`

Returns a boolean that is true if `property` is in the MultyxObject representation, false otherwise. Synonymous with the `in` keyword on a JavaScript object.

#### `MultyxObject.get(property: string): MultyxItem`

Returns the MultyxItem value of a property. This generally does not need to be used, since properties can be accessed directly from the object. This does have to be used, however, if the property has a name that is already a native MultyxObject property or method. It is best practice not to set properties of a MultyxObject that conflicts with the native MultyxObject implementation.

```js
// server.js
console.log(client.self.x);        // does same as below
console.log(client.self.get('x')); // does same as above

console.log(client.self.data);        // logs native Multyx stuff
console.log(client.self.get('data')); // logs MultyxItem data 
```

#### `MultyxObject.set(property: string, value: any): MultyxObject | false`

Set the value of a property, and if accepted, relay the change to any clients with visibility. This will parse `value` and create a MultyxItem representation that mirrors `value`. If setting a value whose property already exists, for instance `client.self.x = 3; client.self.x = 5;`, the MultyxObject will not create a new MultyxValue instance, but merely change the value inside the MultyxValue by calling `.set()`.

This generally does not need to be used, since properties can be assigned directly from the object. This does have to be used, however, if the property has a name that is already a native MultyxObject property or method. It is best practice not to set properties of a MultyxObject that conflicts with the native MultyxObject implementation.

Returns same MultyxObject if change accepted, false otherwise.

#### `MultyxObject.delete(property: string): MultyxObject | false`

Delete the property from the object and relay the change to any clients with visibility.

Returns same MultyxObject

#### `MultyxObject.data`

This is the MultyxObject representation of the original object. It is a key-value pair between strings representing properties of the object, and MultyxItem objects representing the values of the object.

***

### MultyxList

A `MultyxList` is the [`MultyxItem`](#multyxitem) representation of JavaScript arrays. They are inherited from the `MultyxObject` class, so any method or property inside `MultyxObject` is equally valid inside `MultyxList`. They can be indexed directly for assignment and retrieval, and are made up of `MultyxItem` objects that can be nested arbitrarily deep.

Generally, within a `MultyxList`, any changes to the visibility of editability of the object, such as `.disable()` or `.addPublic()` will propogate throughout all children, overwriting any settings that they had prior.

Along with having the methods and properties inherited from `MultyxObject`, `MultyxList` objects have similar properties and methods to Array objects. Unlike Array objects, however, in methods such as `.map()` or `.splice()`, MultyxList will not create a new list, but edit in-place the already existing MultyxList.

#### `MultyxList.length`

Just like Array.length, the `.length` property represents the number of elements in the `MultyxList`.

The slight difference between `Array.length` is the exclusion of `<empty item>`. `MultyxList` does not have a method or property for including `<empty item>` like in `Array` objects, so missing elements are denoted with `undefined` values. The length of a `MultyxList` is calculated by taking the index of the last defined element plus one, so any `<empty item>` elements that would count towards the length in the `Array` object do not in the `MultyxList` object.

This can possibly lead to discrepancies between the client and server, so keep this in mind.

```js
// server.js
client.self.array = ['a'];
client.self.array[5] = 'g';
client.self.array.pop();
console.log(client.self.array.length); // 1

const array = ['a'];
array[5] = 'g';
array.pop();
console.log(array.length); // 5
```

#### `MultyxList.deorder(): MultyxItem[]`

Creates an array containing values of all defined items in MultyxList. This method allows the looping of MultyxList elements without undefined elements. This is a useful method if incorporating client-side interpolation functions. When elements in arrays are shifted over to other indices, the changes in value are sent to the client rather than informing the client of a shift. This means that interpolation skips a frame, as a new [`MultyxClientValue`](#multyxclientvalue) and interpolation function get instantiated. This can be countered by not utilizing Array methods that shift elements' indices, along with utilizing the `MultyxList.deorder()` method.

Instead of using shifting methods such as `MultyxList.splice()` or `MultyxList.shift()` to delete elements of the `MultyxList`, the method `MultyxList.delete()` can be used, and `MultyxList.deorder()` can be iterated over, skipping the deleted element. This allows the `MultyxClientObject` on the client-side to retain index-element pairs, making interpolation functions run smoothly.

```js
// server.js
client.self.array = ['a', 'b', 'c', 'd', 'e'];
client.self.array.delete(2);
console.log(client.self.array);           // ['a', 'b', undefined, 'd', 'e']
console.log(client.self.array.deorder()); // ['a', 'b', 'd', 'e'] 
```

#### `MultyxList.deorderEntries(): [number, MultyxItem][]`

Return an array of entries of all defiend elements inside MultyxList.

```js
// server.js
client.self.array = ['a', 'b', 'c', 'd'];
client.self.array.delete(2);
console.log(client.self.array.deorderEntries()); // [[0, 'a'], [1, 'b'], [3, 'd']]
```

#### `MultyxList.push(...items: any[]): number`

Appends all items to the end of the `MultyxList`

Returns length of `MultyxList`

#### `MultyxList.pop(): MultyxItem | undefined`

Removes and returns the last item in the MultyxList. If the list is empty, it returns undefined.

#### `MultyxList.unshift(...items: any[]): number`

Adds one or more items to the beginning of the MultyxList and returns the new length of the list.

#### `MultyxList.shift(): MultyxItem | undefined`

Removes and returns the first item in the MultyxList. If the list is empty, it returns undefined.

#### `MultyxList.splice(start: number, deleteCount?: number, ...items: any[])`

Changes the contents of the MultyxList by removing or replacing existing elements and/or adding new elements at the specified start index. The deleteCount parameter specifies the number of elements to remove. It shifts elements as needed to accommodate additions.

If utilizing interpolation for values of MultyxList, it is recommended to push new elements and delete old ones instead, as shifted elements will retain unshifted value inside interpolation history, leading to slightly choppy interpolation movement.

#### `MultyxList.slice(start?: number, end?: number)`

Turns MultyxList into a portion of the array ranging from indices `start` to `end` (`end` not included). This does not return a new MultyxList or a reference to a MultyxList, but modifies the original MultyxList.

#### `MultyxList.filter(predicate: (value: any, index: number, array: MultyxList) => boolean)`

Creates a new MultyxList containing only the elements that pass the test implemented by the provided predicate function. The original list is modified to reflect the filtering operation.

#### `MultyxList.map(callbackfn: (value: any, index: number, array: MultyxList) => any)`

Transforms each element of the MultyxList using the provided callback function. The transformed values replace the original values in the list.

#### `MultyxList.flat()`

Flattens nested MultyxList structures by one level, appending the elements of any nested lists to the main list.

#### `MultyxList.reduce(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxList) => any, startingAccumulator: any)`

Applies the provided callback function to reduce the MultyxList to a single value, starting with the given initial accumulator.

#### `MultyxList.reduceRight(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxList) => any, startingAccumulator: any)`

Similar to reduce, but processes the elements of the MultyxList from right to left.

#### `MultyxList.reverse()`

Reverses the order of the elements in the MultyxList in place and returns same MultyxList.

#### `MultyxList.forEach()`

Executes a provided function once for each MultyxList element.

#### `MultyxList.some()`

Tests whether at least one element in the MultyxList passes the test implemented by the provided predicate function. Returns true if so, otherwise false.

#### `MultyxList.every()`

Tests whether all elements in the MultyxList pass the test implemented by the provided predicate function. Returns true if all pass, otherwise false.

#### `MultyxList.find()`

Returns the first element in the MultyxList that satisfies the provided predicate function. If no element satisfies the predicate, it returns undefined.

#### `MultyxList.findIndex()`

Returns the index of the first element in the MultyxList that satisfies the provided predicate function. If no element satisfies the predicate, it returns -1.

#### `MultyxList.entries()`

Returns an array of [value, index] pairs for each element in the MultyxList.

#### `MultyxList.keys()`

Returns an array of the keys (indices) for each element in the MultyxList.

***

### Agent

In server-side Multyx, and agent is either a [`Client`](#client) or a [`MultyxTeam`](#multyxteam). These host the interactions between the client-side and server-side. An Agent contains its own [`MultyxObject`](#multyxobject) along with a UUID, and reference to the server.

#### `Agent.self`

This is the shared state [`MultyxObject`](#multyxobject) on the server side. Any clients that are a part of this agent have the ability to edit and view the entire object.

#### `Agent.uuid`

This is the unique identifier that defines this Agent. It is by default 8 characters long and consists of the lowercase alphabet and numbers. It is the first property in `MultyxItem.propertyPath` to denote which agent the [`MultyxItem`](#multyxitem) belongs to.

#### `Agent.send(eventName: string, data: any)`

Send a custom message to all clients that the agent represents. Takes in an `eventName` to be referenced to on the client side, along with any JSON formatable data to send.

This does not send on frame, and will be sent over Websocket immediately.

#### `Agent.server`

Reference to the MultyxServer object hosting the agent.

#### `Agent.clients`

Array of all clients that the agent represents. If `Agent` is a `Client`, the array will have a length of 1 and the only element will be the `Client` itself. If `Agent` is a [`MultyxTeam`](#multyxteam), the array will be all clients that are a part of the team.

***

### Client

Because a Client is an Agent, all properties and methods that are a part of Agent are also valid inside Client.

#### `Client.controller`

The `controller` property is an instance of the [`Controller`](#controller) class, which manages client input and state synchronization. It enables clients to listen to specific input events (e.g., keyboard, mouse) and execute callbacks when those events occur.

#### `Client.joinTime`

The timestamp in milliseconds when the client was created.

#### `Client.teams`

A Set object containing all [`MultyxTeam`](#multyxteam) objects that the client is a part of.

This is meant to be read-only, adding a client to a team can be done with the `MultyxTeam.addClient()` method.

#### `Client.updateSize`

The size, in bytes, that Multyx is sending over the websocket in the previous update frame.

***

### Controller

The Controller class manages input events and state for clients. It tracks keyboard and mouse inputs, enabling real-time interactivity and customization of input handling.

#### listenTo(input: string | string[], callback?: (state: ControllerState) => void)

Listen to a specified input and trigger a callback when that input gets triggered.

The `input` parameter corresponds to the keyboard `event.key` and `event.code`, along with a variety of inputs that are part of the `Multyx.Input` enum for mouse inputs and special keys.

The callback parameter takes in a function and when triggered passes the current [`ControllerState`](#controllerstate) to the callback.

```js
// server.js
client.controller.listenTo(['w', 's']);

client.controller.listenTo(Input.MouseDown, state => {
    console.log('Going forward? ' + state.keys['w']);
    console.log('Going backward? ' + state.keys['s']);
});
```

***

### ControllerState

The controller state does not by default track any of the client's inputs. Only the inputs that are being listened to by the `Controller` object appear in the state.

```ts
// multyx.ts
export type ControllerState = {
    keys: { [key: string]: boolean },
    mouse: { x: number, y: number, down: boolean }
}
```

### Input

```ts
// multyx.ts
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
    RightControl= "ControlRight",
    LeftAlt = "AltLeft",
    RightAlt = "AltRight",
    
    UpArrow = "ArrowUp",
    DownArrow = "ArrowDown",
    LeftArrow = "ArrowLeft",
    RightArrow = "ArrowRight",
}
```

***

### MultyxTeam

A [`MultyxTeam`](#multyxteam) is at its core a list of [`Client`](#client) classes representing all clients that are part of that team, along with a [`MultyxObject`](#multyxobject) describing the shared data of that team. This [`MultyxObject`](#multyxobject) is public to all clients that are within the team, and by default has the ability to be edited by any [`Client`](#client) in the team, though this can be disabled.

In Multyx, clients do not interact with each other. The [`MultyxTeam`](#multyxteam) class is the only way to share state between clients, as Client1 cannot edit the state of Client2. There is a difference, however, between being able to edit state, and being able to view it. This is achieved by making a [`MultyxItem`](#multyxitem) public to a specified MultyxTeam.

Because a MultyxTeam is an Agent, all properties and methods that are a part of Agent are also valid inside MultyxTeam.

Using the `multyx.all` team that gets provided natively by the [`MultyxServer`](#multyxserver) class, clients can share data to anyone connected to the server.

#### `getClient(uuid: string)`

Retrieves the [`Client`](#client) object corresponding the given `uuid`.

#### `addClient(client: Client)`

Add a client to the MultyxTeam. Relays this change to all clients who are part of the team. This also relays all of the data in `MultyxTeam.self` to the client joining.

#### `removeClient(client: Client)`

Remove a client from the MultyxTeam. Relays this change to all clients who are part of the team. This also clears all data of the `MultyxTeam.self` from the client.

#### `addPublic(item: MultyxItem)`

Make a [`MultyxItem`](#multyxitem) visible to all clients in the team.

```js
// server.js
client1.self.secret = 'amongus imposter';
team.addPublic(client1.self);
team.send('new player');
```

```js
// client2.js
const client1 = multyx.clients[uuidClient1];
console.log(client1); // undefined

multyx.on('new player', () => {
    console.log(client1); // { secret: 'amongus imposter' }
});
```

#### `removePublic(item: MultyxItem)`

Revoke item visibility of a [`MultyxItem`](#multyxitem) from a team. This does not necessarily revoke visibility from all clients in the team, since other clients may have visibility through another team.

```js
// server.js
team.addClient(client1);
team.addClient(client2);
team.addPublic(client1.self);
team.addPublic(client2.self);

multyx.all.removePublic(client1.self);
multyx.all.send('removed');
```

```js
// client2.js
console.log(client1.imposter); // true

multyx.on('removed', () => {
    console.log(client1.imposter); // true
});
```

```js
// client3.js
console.log(client1.imposter); // true

multyx.on('removed', () => {
    console.log(client1.imposter); // undefined
});
```

***

## Client-Side Documentation

### Multyx (client)

A client-side Multyx object is initialized as follows.

```js
const multyx = new Multyx(options?: MultyxOptions | Callback, callback?: Callback);
```

Initializing a Multyx class creates a websocket using the built-in WebSocket API.

```ts
export type Options = {
    port?: number,
    secure?: boolean,
    uri?: string,
    verbose?: boolean,
    logUpdateFrame?: boolean,
};

export const DefaultOptions: Options = {
    port: 443,
    secure: false,
    uri: 'localhost',
    verbose: false,
    logUpdateFrame: false,
};
```

#### `Options.port` (Client)

Port to connect to WebsocketServer from, defaults to 443.

#### `Options.secure`

Boolean representing whether or not to attempt a secure websocket connection (wss://)

This will not work if `Options.uri` is set to localhost, such as in a development environment.

#### `Options.uri`

What URI to attempt to connect websocket at.

#### `Options.verbose`

Log errors if receiving faulty data from MultyxServer, along with logging any denied change requests to a MultyxClientItem. This can be useful if debugging code, to show where the client may be attempting to edit disabled data.

#### `Options.logUpdateFrame`

Logs the raw data sent from MultyxServer from each update frame.

#### `Multyx.uuid`

The UUID assigned to the client at server start.

#### `Multyx.joinTime`

The UNIX timestamp of server accepting new client connection.

#### `Multyx.ping`

The time it takes a Websocket packet to make a round trip from the client to the server and back.

Calculated by multiplying the update frame send time minus update frame receive time times 2.

#### `Multyx.clients`

An object representing the public data of all clients connected to the server. Keys of this object are client UUIDs and values of this object are [MultyxClientObject](#multyxclientobject) objects

#### `Multyx.self`

A [MultyxClientObject](#multyxclientobject) representing the client's shared state with the server. This is the same as `Multyx.clients[Multyx.uuid]`

#### `Multyx.teams`

A [MultyxClientObject](#multyxclientobject) representing the shared state of all teams the client is a part of.

#### `Multyx.all`

A [MultyxClientObject](#multyxclientobject) representing the shared state of the team including all connected clients. This is the same object and same instance as `Multyx.teams['all']`.

#### `Multyx.controller`

The client [`Controller`](#controller-client) that processes client input and relays data to the server.

#### `Multyx Events`

```ts
export default class Multyx {
    static Start = Symbol('start');           // Client first establishes connection
    static Connection = Symbol('connection'); // New client connects to server
    static Disconnect = Symbol('disconnect'); // Other client disconnects from server
    static Edit = Symbol('edit');             // Server edits a MultyxClientItem
    static Native = Symbol('native');         // Any native Multyx event
    static Custom = Symbol('custom');         // Any custom Multyx event
    static Any = Symbol('any');               // Any Multyx event
}
```

#### `Multyx.on(name: string | Symbol, callback: Callback)`

Listen to event sent by server. Will call `callback` with specific data from server.

If `name` is a Multyx Event, the argument sent to callback will be determined by which event is being listened to:

```ts
Multyx.Start // Raw update from MultyxServer
Multyx.Connection // MultyxClientItem representing newly connected client
Multyx.Disconnect // Raw object representing disconnected client
Multyx.Edit // Raw update from MultyxServer 
Multyx.Native // Raw message from MultyxServer
Multyx.Custom  // Raw message from MultyxServer
Multyx.Start // Raw message from MultyxServer
```

#### `Multyx.send(name: string, data: any, expectResponse: boolean = false)`

Send an event to the server with the event name `name` and any extra data.

Returns either a promise if `expectResponse` is true, undefined otherwise.

#### `Multyx.loop(callback: Callback, timesPerSecond?: number)`

Create a loop that calls the `callback` function every `1/timesPerSecond` seconds. If `timesPerSecond` is left undefined, Multyx will use `requestAnimationFrame` to repeatedly call the `callback`.

It is recommended for animation purposes, such as rendering the screen, to leave `timesPerSecond` undefined, as `requestAnimationFrame` is built to handle rendering loops.

#### `Multyx.forAll(callback: (client: MultyxClient) => void)`

Create a callback function that gets called for any current or future client

***

### Controller (Client)

The client controller is the class that watches for and relays changes in the client input.

#### `Controller.keys`

The state of key inputs stored in a key-value pair between keyboard event `event.key` or `event.code` to a boolean describing if the key is currently being pressed.

```js
// client.js
console.log(multyx.controller.keys['a']); // true
console.log(multyx.controller.keys['ShiftLeft']); // false
```

#### `Controller.mouse`

The state of mouse inputs.

```ts
// multyx.ts
this.mouse = {
    x: NaN,       // x-value of mouse in mouse coordinates
    y: NaN,       // y-value of mouse in mouse coordinates
    down: false,  // true if mouse is pressed, false otherwise
    centerX: 0,   // translation factor of mouse x
    centerY: 0,   // translation factor of mouse y
    scaleX: 1,    // scaling factor of mouse x
    scaleY: 1     // scaling factor of mouse y
};
```

#### `Controller.listening`

A Set object containing all input events to listen to and relay to client. This gets populated by the server so it is recommended to let this be read-only.

#### `Controller.mapCanvasPosition(canvas: HTMLCanvasElement, position: { top?: number, bottom?: number, left?: number, right?: number, anchor?: 'center' | 'left' | 'right' | 'top' | 'bottom' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright' })`

Maps the canvas coordinates to a specified position, using the `anchor` parameter to find where the origin is, along with the `position` parameter to scale the canvas properly.

Only the necessary position data is required. If partial data is entered, Multyx will attempt to calculate the values by assuming square coordinates (1 unit horizontal = 1 unit vertical).

```js
// client.js

// will make canvas coordinate (0, 0) correspond to bottom-left
// and make top of canvas be 1000 units while keeping canvas scale square
multyx.controller.mapCanvasPosition(canvas, { top: 1000 }, 'bottomleft');

// will map canvas coordinates to correspond to these positions
multyx.controller.mapCanvasPosition(canvas, { top: 10, left: -10, bottom: -10, right: 10 });

// Error: Cannot include value for right if anchoring at right
multyx.controller.mapCanvasPosition(canvas, { right: 500 }, 'right');
```

#### `Controller.mapMousePosition(centerX: number, centerY: number, anchor: HTMLElement = document.body, scaleX: number = 1, scaleY: number = scaleX)`

Maps the mouse coordinates to a the top-left corner of a specific `anchor` element.

#### `Controller.mapMouseToCanvas(canvas: HTMLCanvasElement)`

Maps the mouse coordinates exactly to the canvas coordinates. Very useful for most applications and makes calculations and animations simpler.

#### `Controller.setMouseAs(mouseGetter: () => { x: number, y: number })`

Relays the mouse coordinates as whatever the `mouseGetter` argument returns when called. This is useful if utilizing another library that already has mouse mapping. This does not change the client-side `Controller.mouse` coordinates, but it does relay the mouse coordinates retrieved from the `mouseGetter` argument. For accurate client-side mouse coordinates, use the mouse coordinates from the other library.

***

### MultyxClientItem

A `MultyxClientItem` is the base of shared state on the client side. A `MultyxClientItem` is merely a union type between the following, [`MultyxClientValue`](#multyxclientvalue), [`MultyxClientObject`](#multyxclientobject), and [`MultyxClientList`](#multyxclientlist). When a property is changed, deleted, or set inside a `MultyxClientItem`, that change gets relayed to the server.

Any assignments to a `MultyxClientItem` or the creation of a child on a `MultyxClientItem` property, such as setting `multyx.self.position = { x: 3, y: 2 };` will turn the value of the assignment into a `MultyxClientItem` itself.

`MultyxClientItem` objects cannot be directly created through the client-side code, as they require references to the MultyxServer. They do, however, exist on the `multyx.self`, `multyx.all` or `multyx.teams` properties.

#### `MultyxClientItem.value`

The original representation of the MultyxClientItem, or the MultyxClientItem's respective primitive, object, or array.

```js
// client.js
multyx.self.position = { x: 30, y: 100 };

console.log(multyx.self.position); // MultyxObject { x: 30, y: 100 }
console.log(multyx.self.position.value); // { x: 30, y: 100 }
```

#### `MultyxClientItem.editable`

A boolean representing whether or not the server is allowing the MultyxClientItem to be changed, altered or deleted. If true, any edits can be sent to the server where they will go through more verification and should be accepted. If false, any edits will be immediately canceled.

***

### MultyxClientValue

A `MultyxClientValue` is the [`MultyxClientItem`](#multyxclientitem) representation of primitive values, which includes strings, numbers, and booleans. These are the fundamental blocks of MultyxItems, which [`MultyxClientObject`](#multyxclientobject) and [`MultyxClientList`](#multyxclientlist) classes are made up of.

#### `MultyxClientValue.set(value: Value | MultyxClientValue)`

Set the value of the MultyxClientValue. This will run the requested value through all of the constraints and, if accepted, will relay the change to the server to request the change.

This generally doesn't need to be used, since the value of MultyxClientValue can be set explicitly with native operators.

Returns boolean representing success of operation.

```js
// client.js
multyx.self.x = 3;    // does the same thing as below
multyx.self.x.set(3); // does the same thing as above
```

#### `MultyxClientValue.constraints`

An object containing the constraints placed onto the MultyxClientValue from the server, excluding any custom ones. The key of this object is the name of the constraint, and the value of this object is the constraint function.

```js
// server.js
client.self.x.min(-100);
```

```js
// client.js
console.log(multyx.self.x.constraints); // { 'min':  n => n >= -100 ? n : -100 }
```

#### `MultyxClientValue.Lerp()`

Linearly interpolate the value of MultyxClientValue across updates. This will run 1 frame behind on average, since it uses the last two updates to interpolate between.

This interpolation method pretends that time is 1 frame behind, and will take the ratio between the time since last frame to the time between last 2 frames as the progress between values in each frame. This means that if the time between frames is not constant, this interpolation method will not work as smoothly as it could.

Since updates may happen sparsely instead of during each frame, this interpolator method assumes a maximum time between frames as 250 milliseconds, and will interpolate using that time frame.

```js
// client.js
multyx.self.x = 0;
multyx.self.x.Lerp();

await sleep(50);
multyx.self.x = 10;

console.log(multyx.self.x); // 0
await sleep(17);
console.log(multyx.self.x); // 3.4
await sleep(16);
console.log(multyx.self.x); // 6.6
await sleep(17);
console.log(multyx.self.x); // 10
```

#### `MultyxClientValue.PredictiveLerp()`

Linearly interpolate between the past update and the expected value of the next update. This method is similar to the `MultyxClientValue.Lerp()` method, except instead of interpolating between the past two updates, Multyx predicts where the value will be on the next update.

Multyx does this by taking the change in the value between the previous updates and extrapolates that into the future.

This works very well on values that have a set change each frame, such as a projectile or object with a constant speed.

```js
multyx.self.x = 0;
multyx.self.x.PredictiveLerp();

await sleep(50);
multyx.self.x = 10;

console.log(multyx.self.x); // 10
await sleep(17);
console.log(multyx.self.x); // 13.4
await sleep(16);
console.log(multyx.self.x); // 16.6
await sleep(17);
console.log(multyx.self.x); // 20
```

### MultyxClientObject

A `MultyxClientObject` is the [`MultyxClientItem`](#multyxclientitem) representation of JavaScript objects, or key-value pairs. These consist of strings representing properties of the original object, corresponding to MultyxItem objects representing the values of the original object. The original object is the JavaScript object that MultyxObject is mirroring. These can be nested arbitrarily deep, and child elements can host any type of [`MultyxClientItem`](#multyxclientitem).

#### `MultyxClientObject.has(property: string): boolean`

Returns a boolean that is true if `property` is in the MultyxClientObject representation, false otherwise. Synonymous with the `in` keyword on a JavaScript object.

#### `MultyxClientObject.get(property: string): MultyxClientItem`

Returns the MultyxClientItem value of a property. This generally does not need to be used, since properties can be accessed directly from the object. This does have to be used, however, if the property has a name that is already a native MultyxClientObject property or method. It is best practice not to set properties of a MultyxClientObject that conflicts with the native MultyxClientObject implementation.

```js
// server.js
console.log(client.self.x);        // does same as below
console.log(client.self.get('x')); // does same as above

console.log(client.self.data);        // logs native Multyx stuff
console.log(client.self.get('data')); // logs MultyxItem data 
```

#### `MultyxClientObject.set(property: string, value: any): boolean`

Set the value of a property, and if accepted by all the constraints, relay the change the server for verification. This will parse `value` and create a MultyxClientItem representation that mirrors `value`. If setting a value whose property already exists, for instance `client.self.x = 3; client.self.x = 5;`, the MultyxClientObject will not create a new MultyxClientValue instance, but merely change the value inside the MultyxClientValue by calling `.set()`.

This generally does not need to be used, since properties can be assigned directly from the object. This does have to be used, however, if the property has a name that is already a native MultyxClientObject property or method. It is best practice not to set properties of a MultyxClientObject that conflicts with the native MultyxClientObject implementation.

Returns true if change accepted on client-side, false otherwise.

#### `MultyxClientObject.delete(property: string): boolean`

Delete the property from the object and relay the change to server for verification.

Returns true if change accepted on client-side, false otherwise.

#### `MultyxClientObject.forAll(callbackfn: (key: any, value: any) => void)`

Creates a callback function that gets called for any current or future property in MultyxClientObject.

This does not immediately call the callback function on future property creation, as creation may be made in the middle of an update frame before the property was fully populated with the update. Therefore, the callback function will be called at the end of an update frame.

#### `MultyxClientObject.keys()`

Returns an array of the keys of the object representation. Functions the same as `Object.keys(MultyxClientObject.value)`.

#### `MultyxClientObject.values()`

Returns an array of the values of the object representation. Functions the same as `Object.values(MultyxClientObject.value)`.

#### `MultyxClientObject.entries()`

Returns an array of the entries of the object representation. Functions the same as `Object.entries(MultyxClientObject.value)`.

### MultyxClientList

A `MultyxClientList` is the [`MultyxClientItem`](#multyxclientitem) representation of JavaScript arrays. They are inherited from the `MultyxClientObject` class, so any method or property inside `MultyxClientObject` is equally valid inside `MultyxClientList`. They can be indexed directly for assignment and retrieval, and are made up of `MultyxClientItem` objects that can be nested arbitrarily deep.

Along with having the methods and properties inherited from `MultyxClientObject`, `MultyxClientList` objects have similar properties and methods to Array objects. Unlike Array objects, however, in methods such as `.map()` or `.flat()`, MultyxClientList will not create a new list, but edit in-place the already existing MultyxClientList.

#### `MultyxClientList.length`

Just like Array.length, the `.length` property represents the number of elements in the `MultyxClientList`.

The slight difference between `Array.length` is the exclusion of `<empty item>`. `MultyxClientList` does not have a method or property for including `<empty item>` like in `Array` objects, so missing elements are denoted with `undefined` values. The length of a `MultyxClientList` is calculated by taking the index of the last defined element plus one, so any `<empty item>` elements that would count towards the length in the `Array` object do not in the `MultyxClientList` object.

This can possibly lead to discrepancies between the client and server, so keep this in mind.

```js
// client.js
multyx.self.array = ['a'];
multyx.self.array[5] = 'g';
multyx.self.array.pop();
console.log(multyx.self.array.length); // 1

const array = ['a'];
array[5] = 'g';
array.pop();
console.log(array.length); // 5
```

#### `MultyxClientList.forAll(callbackfn: (value: any, index: number) => void)`

Equivalent to `MultyxClientObject.forAll` Creates a callback function that gets called for any current or future element in MultyxClientList.

This does not immediately call the callback function on future element creation, as creation may be made in the middle of an update frame before the element was fully populated with the update. Therefore, the callback function will be called at the end of an update frame.

#### `MultyxClientList.deorder(): MultyxClientItem[]`

Return an array of all defined elements inside MultyxClientList. View [`MultyxList.deorder()`](#multyxlistdeorder-multyxitem) for more information.

#### `MultyxClientList.deorderEntries(): [number, MultyxClientItem][]`

Return an array of entries of all defiend elements inside MultyxClientList.

```js
// client.js
multyx.self.array = ['a', 'b', 'c', 'd'];
multyx.self.array.delete(2);
console.log(multyx.self.array); // ['a', 'b', undefined, 'd']
console.log(multyx.self.array.deorder()); // ['a', 'b', 'd']
console.log(multyx.self.array.deorderEntries()); // [[0, 'a'], [1, 'b'], [3, 'd']]
```

#### `MultyxClientList.push(...items: any[]): number`

Appends all items to the end of the `MultyxClientList`

Returns length of `MultyxClientList`

#### `MultyxClientList.pop(): MultyxItem | undefined`

Removes and returns the last item in the MultyxClientList. If the list is empty, it returns undefined.

#### `MultyxClientList.unshift(...items: any[]): number`

Adds one or more items to the beginning of the MultyxClientList and returns the new length of the list.

#### `MultyxClientList.shift(): MultyxItem | undefined`

Removes and returns the first item in the MultyxClientList. If the list is empty, it returns undefined.

#### `MultyxClientList.splice(start: number, deleteCount?: number, ...items: any[])`

Changes the contents of the MultyxClientList by removing or replacing existing elements and/or adding new elements at the specified start index. The deleteCount parameter specifies the number of elements to remove. It shifts elements as needed to accommodate additions.

#### `MultyxClientList.filter(predicate: (value: any, index: number, array: MultyxClientList) => boolean)`

Creates a new MultyxClientList containing only the elements that pass the test implemented by the provided predicate function. The original list is modified to reflect the filtering operation.

#### `MultyxClientList.map(callbackfn: (value: any, index: number, array: MultyxClientList) => any)`

Transforms each element of the MultyxClientList using the provided callback function. The transformed values replace the original values in the list.

#### `MultyxClientList.flat()`

Flattens nested MultyxClientList structures by one level, appending the elements of any nested lists to the main list.

#### `MultyxClientList.reduce(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxClientList) => any, startingAccumulator: any)`

Applies the provided callback function to reduce the MultyxClientList to a single value, starting with the given initial accumulator.

#### `MultyxClientList.reduceRight(callbackfn: (accumulator: any, currentValue: any, index: number, array: MultyxClientList) => any, startingAccumulator: any)`

Similar to reduce, but processes the elements of the MultyxClientList from right to left.

#### `MultyxClientList.reverse()`

Reverses the order of the elements in the MultyxClientList in place and returns same MultyxClientList.

#### `MultyxClientList.forEach()`

Executes a provided function once for each MultyxClientList element.

#### `MultyxClientList.some()`

Tests whether at least one element in the MultyxClientList passes the test implemented by the provided predicate function. Returns true if so, otherwise false.

#### `MultyxClientList.every()`

Tests whether all elements in the MultyxClientList pass the test implemented by the provided predicate function. Returns true if all pass, otherwise false.

#### `MultyxClientList.find()`

Returns the first element in the MultyxClientList that satisfies the provided predicate function. If no element satisfies the predicate, it returns undefined.

#### `MultyxClientList.findIndex()`

Returns the index of the first element in the MultyxClientList that satisfies the provided predicate function. If no element satisfies the predicate, it returns -1.

#### `MultyxClientList.entries()`

Returns an array of [value, index] pairs for each element in the MultyxClientList.

#### `MultyxClientList.keys()`

Returns an array of the keys (indices) for each element in the MultyxClientList.

***

## Starter Project Walkthrough

Let's start out by making a simple game, where clients move around in a box. The full code for this example is in `/examples/squares/`

We need to start by setting up our file structure and basic HTML code.

Let's make 3 files, `index.html` to host our HTML, `script.js` for our client code, and `index.js` for our server code.
***

```html
<!DOCTYPE html>
<html>
    <head>
        <title>My First Multyx Game</title>
    </head>
    <body>
        <canvas id="canvas" width="600px" height="600px"></canvas>
        <script src="https://cdn.jsdelivr.net/npm/multyx@0.1.0/client.js"></script>
        <script src="script.js"></script>
    </body>
</html>
```

Here is the setup for our `index.html` file. This code will create a square canvas in our website with a width of 600px. We also include 2 scripts, the first one hosting all of Multyx, and the second one hosting our client code to interact with Multyx.
***

```js
// script.js
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const multyx = new Multyx();

multyx.controller.mapCanvasPosition(canvas, { top: 1000, anchor: 'bottomleft' });
multyx.controller.mapMouseToCanvas(canvas);
```

Here is the setup for our `script.js` file, or our client-side code. This code first gets the canvas element and stores it to the `canvas` variable, along with getting the 2d context `ctx` allowing us to draw on this canvas. We then initialize our Multyx client, connecting the websocket server and initializing all client and team information. It then uses two Multyx functions called `mapCanvasPosition` and `mapMouseToCanvas`. What these do is normalize the values of our mouse and our canvas, making it a lot easier to do math with these values and draw objects on the canvas.

What `multyx.controller.mapCanvasPosition` does is tell the canvas to have its origin in the bottom-left, meaning the point `(0, 0)` on our canvas will be at the bottom-left of the element on the screen. Multyx then tells the canvas to make the top have a y-value of 1000, meaning the point `(0, 1000)` on our canvas will be the top-left of the element on the screen. Multyx then tries to make the canvas coordinates a square, meaning that 1 unit vertically is the same number of pixels as 1 unit horizontally. Since we know our canvas is a square, and Multyx just made the canvas 1000 units tall, we know that the canvas is 1000 units across as well.

The `multyx.controller.mapMouseToCanvas` function tells our Multyx client to relay our mouse coordinates based on where our mouse is on the canvas. This basically links the mouse to the canvas, telling the Multyx server where on the canvas, in canvas coordinates, our mouse is hovering over. This will make calculations easier later.

We can now setup our `index.js` file.

***

```js
// index.js
const Multyx = require('../../server/dist/index').default;

const multyx = new Multyx.MultyxServer();

multyx.on(Multyx.Events.Connect, ({ self, controller }) => {
    self.color = '#'
        + Math.floor(Math.random() * 8)
        + Math.floor(Math.random() * 8)
        + Math.floor(Math.random() * 8);
        
    self.direction = 0;
    self.x = Math.round(Math.random() * 600);
    self.y = Math.round(Math.random() * 600);

    self.addPublic(multyx.all).disable();
    self.x.min(0).max(600);
    self.y.min(0).max(600);

    controller.listenTo(Multyx.Input.MouseMove);
});
```

Here is the setup for our `index.js` file, or our server-side code. What this does first is import the Multyx module, and then initializes our `MultyxServer`, creating the websocket server and allowing websocket connections to come in.

We then listen for a connection event by using `multyx.on` and listening for `Multyx.Events.Connect`, and create our callback to deal with our incoming client.

This callback function takes in the `Client` object representing our client who just connected, specifically taking the `Client.self`, and `Client.controller` properties.

Inside our callback function, we set a bunch of properties to share to the client, such as `color`, which we set to a random hex color between `#000` and `#888`, and `x` and `y`, which we set to a random number between 0 and 600.

We then make the `Client.self` object public to all clients through the `multyx.all` team, and disable it, meaning that the client cannot edit it. After this, we tell the controller to listen to the `Multyx.Input.MouseMove` event, which tells the client to send an update any time the mouse is moved.

This is all we need for the initialization in the server. Now that all of our client data is public, we can go back to our client and start rendering the players.

```js
// script.js
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const multyx = new Multyx();

multyx.controller.mapCanvasPosition(canvas, { top: 600, anchor: 'bottomleft' });
multyx.controller.mapMouseToCanvas(canvas);

multyx.loop(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(const player of Object.values(multyx.clients)) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x - 10, player.y - 10, 20, 20);
    }
});

multyx.forAll(client => {
    client.x.Lerp();
    client.y.Lerp();
});
```

In our updated client-side code, we added a `multyx.loop` function, which has a callback that renders everything. The `loop` method in Multyx will run the callback function on a cycle a specific number of times a second. This can be defined as the second argument passed to `multyx.loop`, but if it left empty, Multyx will default to using `requestAnimationFrame` to loop. This is the browsers built-in animation rendering caller.

We first clear the entire screen in order to draw the new frame onto the screen. We then loop through our clients, set the color to the current player's color, and make a rectangle on the screen at the player's coordinates.

The next part of the code calls the `multyx.forAll` function. This function will run on every client, as well as any clients that connect in the future. This is a useful function, allowing the client to apply an interpolation function or process other client's data as soon as they connect.

In this code, we apply an interpolation function called `Lerp`. This will ensure smooth animation and make the rendering look clean instead of choppy. We apply this to the `client.x` and `client.y` values, meaning that the position of our client on each render will move smoothly across.

All we have to do now is to calculate the client's position on the server, and everything is setup.

```js
// index.js
const Multyx = require('../../server/dist/index').default;

const multyx = new Multyx.MultyxServer();

multyx.on(Multyx.Events.Connect, ({ self, controller }) => {
    self.color = '#'
        + Math.floor(Math.random() * 8)
        + Math.floor(Math.random() * 8)
        + Math.floor(Math.random() * 8);

    self.direction = 0;
    self.x = Math.round(Math.random() * 600);
    self.y = Math.round(Math.random() * 600);

    self.addPublic(multyx.all).disable();
    self.x.min(0).max(600);
    self.y.min(0).max(600);

    controller.listenTo(Multyx.Input.MouseMove);
});

multyx.on(Multyx.Events.Update, () => {
    for(const { self, controller } of multyx.all.clients) {
        // Set player direction to mouse direction
        self.direction = Math.atan2(
            controller.state.mouse.y - self.y,
            controller.state.mouse.x - self.x
        );

        // Make the speed proportional to distance
        const distance = Math.hypot(
            controller.state.mouse.x - self.x,
            controller.state.mouse.y - self.y
        );

        // Have a maximum speed of 200
        const speed = Math.min(200, distance);

        // Move player in direction of mouse
        self.x += speed * Math.cos(self.direction) * multyx.deltaTime;
        self.y += speed * Math.sin(self.direction) * multyx.deltaTime;
    }
});
```

What we have added is an update event listener. When the `Multyx.Events.Update` event gets called, which is right before each frame is sent, we loop through all clients, calculate their direction and speed, and calculate how much we need to move the client.

We use the `Math.atan2()` method to calculate the angle between the mouse and the player, and the `Math.hypot()` method to calculate the distance between the mouse and the player. We then make the speed equivalent to the distance, and cap it at 200.

We then update the client position to move in the direction of the mouse at the given speed. We use the `Math.cos()` and `Math.sin()` methods on our direction to get the x and y-values of our movement respectively, and multiply by our `deltaTime` to make sure the amount we move in that time is proportional to the time between frames.
