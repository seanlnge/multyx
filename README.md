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

Having a shared read/write state is easily the most important aspect of Multyx, so a lot is put into making it seamless and worthwhile. Shared state in Multyx is made through the [`MultyxItem`](#multyxitem) type, which includes the classes [`MultyxObject`](#multyxobject), [`MultyxList`](#multyxlist), and [`MultyxValue`](#multyxvalue). These are Multyx's shared-state versions of objects, arrays, and primitives, respectively. Each of these acts like their fundamental counterpart, for instance:

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
console.log(Multyx.teams.players.messages); // Error: "messages" doesn't exist on undefined

const joinStatus = await Multyx.send('join game', 'player1');

console.log(joinStatus); // success!
console.log(Multyx.teams.players.messages); // ["hello world", "player1 just joined"]
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
Multyx.on(Multyx.Start, () => {
    for(const uuid in Multyx.all) {
        console.log(Multyx.clients[uuid]); // { x: 100, y: 300 }
        console.log(Multyx.clients[uuid].role); // undefined 
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
const multyx = new Multyx.MultyxServer(options?: Multyx.Options);
```

Initializing a MultyxServer creates a WebsocketServer using the node 'ws' module.

```js
export type Options = {
    tps?: number,
    port?: number,
    server?: Server, 
    removeDisconnectedClients?: boolean,
    respondOnFrame?: boolean,
    sendConnectionUpdates?: boolean,
    websocketOptions?: ServerOptions,
    onStart?: () => void,
};

export const DefaultOptions: Options = {
    tps: 20,
    port: 443,
    removeDisconnectedClients: true,
    respondOnFrame: true,
    sendConnectionUpdates: true,
    websocketOptions: {
        perMessageDeflate: true,
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

If true, disconnected clients will be removed from any MultyxTeam they are part of. If false, disconnected clients will remain in any MultyxTeam. All clients will still receive a DisconnectionUpdate.

#### `Options.respondOnFrame`

If true, responses to manual Websocket events such as `const a = await Multyx.send();` will be added to the update queue and sent in frame with the rest of the updates. If false, responses will be immediately sent after processing. False not recommended unless there is a use-case, since updates will not have been relayed to the client.

```js
// server.js
const multyx = new MultyxServer({ respondOnFrame: false });
multyx.on('setBlue', client => client.self.color = 'blue');
```

```js
// client.js
await Multyx.send('setBlue');
console.log(Multyx.self.color); // undefined
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

A `MultyxItem` is the base of shared state in Multyx. A `MultyxItem` is merely a union type between the following, [`MultyxValue`](#multyxvalue), [`MultyxObject`](#multyxobject), and [`MultyxList`](#multyxlist). When a property is changed, deleted, or set inside a `MultyxItem`, that change gets relayed to all clients that have been provided visibility. These are all of the properties and methods shared between all classes in `MultyxItem`.

Any assignments to a `MultyxItem` or the creation of a child to a `MultyxItem`, such as setting `client.self.position = { x: 3, y: 2 };` will turn the value of the assignment into a `MultyxItem` itself.

MultyxItem objects cannot be directly created through the server-side code, as they require an owner and references to the MultyxServer. They do, however, exist on the `Client.self` or `MultyxTeam.self` properties.

#### `MultyxItem.value`

The fundamental representation of the MultyxItem, or the MultyxItem's respective primitive, object, or array.

```js
// server.js
team.self.position = { x: 30, y: 100 };

console.log(team.self.position); // MultyxObject { x: 30, y: 100 }
console.log(team.self.position.value); // { x: 30, y: 100 }
```

#### `MultyxItem.disabled`

Boolean representing whether or not the MultyxItem is disabled, or able to be edited by the client.

#### `MultyxItem.disable()`

Disable the MultyxItem from being edited by the client.

Returns same MultyxItem

#### `MultyxItem.enable()`

Allow the MultyxItem to be edited by the client.

Returns same MultyxItem

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

A `MultyxValue` is the [`MultyxItem`](#multyxitem) representation of primitive values, which includes strings, numbers, and booleans. These are the fundamental blocks of MultyxItems, which [`MultyxObject`](#multyxobject) and [`MultyxList`](#multyxclientlist) classes are made up of.

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

console.log(client.self.constraints);
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

A `MultyxObject` is the [`MultyxItem`](#multyxitem) representation of JavaScript objects, or key-value pairs. These consist of strings representing properties of the fundamental object, pairing to MultyxItems representing the values of the fundamental object. The fundamental object is the JavaScript object that MultyxObject is mirroring. These can be nested arbitrarily deep, and child elements can host any type of [`MultyxItem`](#multyxitem).

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

#### `MultyxObject.disableShape(recursive: boolean = false)`

Disable setting or deleting any properties that do not already exist within the MultyxObject by the client. This does not stop server code from changing the shape of MultyxObject.

The `recursive` parameter takes in a boolean and if true, will propogate this change to all children elements recursively. If false, only the shape of this MultyxObject will be disabled.

Returns same MultyxObject

#### `MultyxObject.enableShape(recursive: boolean = false)`

Enable setting or deleting any properties that do not already exist within the MultyxObject by the client.

The `recursive` parameter takes in a boolean and if true, will propogate this change to all children elements recursively. If false, only the shape of this MultyxObject will be enabled.

Returns same MultyxObject

#### `MultyxObject.shapeDisabled`

Boolean that is true if the MultyxObject allows clients to assign or delete properties, false otherwise.

#### `MultyxObject.data`

This is the MultyxObject representation of the fundamental object. It is a key-value pair between strings representing properties of the object, and MultyxItem objects representing the values of the object.

***

### MultyxList

A `MultyxList` is the [`MultyxItem`](#multyxitem) representation of JavaScript arrays. They are inherited from the `MultyxObject` class, so any method or property inside `MultyxObject` is equally valid inside `MultyxList`. They can be indexed directly for assignment and retrieval, and are made up of `MultyxItem` objects that can be nested arbitrarily deep.

Generally, within a `MultyxList`, any changes to the visibility of editability of the object, such as `.disable()` or `.addPublic()` will propogate throughout all children, overwriting any settings that they had prior.

Along with having the methods and properties inherited from `MultyxObject`, `MultyxList` objects have similar properties and methods to Array objects. Unlike Array objects, however, in methods such as `.map()` or `.flat()`, MultyxList will not create a new list, but edit in-place the already existing MultyxList.

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

const a = ['a'];
a[5] = 'g';
a.pop();
console.log(a.length); // 5
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

In server-side Multyx, and agent is either a [Client](#client) or a [MultyxTeam](#multyxteam). These host the interactions between the client-side and server-side. An Agent contains its own [MultyxObject](#multyxobject) along with a UUID, and reference to the server.

#### `Agent.self`

This is the shared state [MultyxObject](#multyxobject) on the server side. Any clients that are a part of this agent have the ability to edit and view the entire object.

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

#### `Client.controller`

#### `Client.joinTime`

#### `Client.ws`

#### `Client.teams`

***

### Controller

***

### MultyxTeam

***

## Client-Side Documentation

### Multyx (client)

### MultyxClientItem

### MultyxClientValue

### MultyxClientObject

### MultyxClientList

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
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

Multyx.controller.mapCanvasPosition(canvas, { top: 1000, anchor: 'bottomleft' });
Multyx.controller.mapMouseToCanvas(canvas);
```

Here is the setup for our `script.js` file, or our client-side code. This code first gets the canvas element and stores it to the `canvas` variable, along with getting the 2d context `ctx` allowing us to draw on this canvas. It then uses two Multyx functions called `mapCanvasPosition` and `mapMouseToCanvas`. What these do is normalize the values of our mouse and our canvas, making it a lot easier to do math with these values and draw objects on the canvas.

What `Multyx.controller.mapCanvasPosition` does is tell the canvas to have its origin in the bottom-left, meaning the point `(0, 0)` on our canvas will be at the bottom-left of the element on the screen. Multyx then tells the canvas to make the top have a y-value of 1000, meaning the point `(0, 1000)` on our canvas will be the top-left of the element on the screen. Multyx then tries to make the canvas coordinates a square, meaning that 1 unit vertically is the same number of pixels as 1 unit horizontally. Since we know our canvas is a square, and Multyx just made the canvas 1000 units tall, we know that the canvas is 1000 units across as well.
***

```js
import Multyx from '../../server/dist/index';

const multyx = new Multyx.MultyxServer();
```

Here is the setup for our `index.js` file, or our server-side code.
