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

Having a shared read/write state is easily the most important aspect of Multyx, so a lot is put into making seamless and worthwhile. Shared state in Multyx is made through the [`MultyxItem`](#multyxitem) type, which includes the classes [`MultyxObject`](#multyxobject), [`MultyxList`](#multyxlist), and [`MultyxValue`](#multyxvalue). These are Multyx's shared-state versions of objects, arrays, and primitives, respectively. Each of these acts like their fundamental counterpart, for instance:

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

When a [`MultyxItem`](#multyxitem) get changed, the Multyx server needs to know which clients to send the information to, along with which clients have which permissions. This is all handled through the [`MultyxTeam`](#multyxteam) class.

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

## Documentation

***

### Server-Side

#### MultyxServer

#### MultyxItem

#### MultyxValue

#### MultyxObject

#### MultyxList

#### Agent

#### Client

#### MultyxTeam

***

### Client-Side

#### Multyx (client)

#### MultyxClientItem

#### MultyxClientValue

#### MultyxClientObject

#### MultyxClientList

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
