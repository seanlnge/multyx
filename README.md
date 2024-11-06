### Multyx
Welcome to the first pre-release release of Multyx, a framework that prioritizes developer experience by making building multiplayer browser games easy on both the client and server-side.
***
As we are only in the first release, there's undoubtedly more to come, but there is already a significant number of features. Along with a seamless websocket connection functionality to allow you to jump straight into coding, Multyx includes:
### Shared Read/Write State between Client and Server
Being able to communicate changes in data is necessary for a functional multiplayer game, but due to needing server-side verification, consistency across websocket endpoints, and a lack of type validation, it can be difficult to bridge the gap between the client and server data transfer. Multyx streamlines this process by including a shared state between the server and client, along with
* Control over which data is public to whom
* Ability to constrain and verify data sent by client
* Ability to disable/enable client editing
* Client-side constraint prediction
### Input Controller and Event Listeners
Client interactivity is a necessity in any game, but with it being hard to standardize mouse position across varying screen sizes, and manage the state of inputs, it can be tricky to implement an input system. Multyx allows you to

* Pick which inputs to listen to
* Ability to standardize mouse location
* View the state of inputs from both the server and client
* Allow for multiple callbacks on an input type

### Helpful Functionalities

Making a functional, efficient, and secure multiplayer game is notoriously hard to do, as each project has its own needs. Multyx offers a variety of helpful functionalities such as

* Interpolation methods for client-side prediction
* Client knowledge of constraints to reduce redundancy
* Teams to manage public state across groups of clients

***
Focused on ease of use and a good developer experience, Multyx turns the difficulty and complexity while making a multiplayer browser game into a simpler process that anyone can jump into. 
***
### Setup:
Server:
```js
import Multyx from 'multyx';
import * as express from 'express';

const server = express().listen(8080, () => console.log('server started'));
const multyx = new Multyx.MultyxServer(server);
```
Client:
```html
<canvas width="400" height="400" id="canvas"></canvas>
<script src="https://cdn.jsdelivr.net/npm/multyx@0.0.3/client.js"></script>
<script>
const multyx = new Multyx();
</script>
```

### Creating a Shared Object:
Server:
```js
multyx.on('connect', client => {
    // Initialize client with random color and position
    client.shared.set("player", {
        color: '#' + Math.floor(Math.random() * 3840 + 256).toString(16),
        position: {
            x: Math.round(Math.random() * 400),
            y: Math.round(Math.random() * 400)
        }
    });
});
```
Client:
```js
const multyx = new Multyx();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

multyx.on(Multyx.Start, () => {
    window.player = multyx.client.player;
    console.log(player.color, player.position); // #e8d, { x: 134, y: 193 }
    requestAnimationFrame(update);
});

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for(const { player } of Object.values(multyx.clients)) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.position.x-10, player.position.y-10, 20, 20);
    }
    requestAnimationFrame(update);
}
```

### Adding Constraints on Shared Object
Server:
```js
multyx.on('connect', client => {
    // Initialize client with random color and position
    client.shared.set("player", {
        color: '#' + Math.floor(Math.random() * 3840 + 256).toString(16),
        position: {
            x: Math.round(Math.random() * 400),
            y: Math.round(Math.random() * 400)
        }
    });

    const player = client.shared.get("player");
    player.public(); // Make client's player object public to all clients
    player.disable(); // Make client's player object read-only to client
    player.get('position').get('x').min(0).max(400); // Constrain `player.position.x` to be 0-400
    player.get('position').get('y').constrain(y => Math.min(400, Math.max(0, y))); // Constrain `player.position.y` to be 0-400
});
```

### Listen for Inputs
The `client.controller.listenTo` function takes in 1 required argument and 1 optional argument.

```ts
client.controller.listenTo(
    input: Input | string | (Input | string)[],
    callback?: (state: ControllerState) => void
)
```
The `input` parameter describes what input Multyx should listen to from the client. If passed an array, Multyx listens to all of the inputs and calls the callback - if provided - if any inputs are triggered.

The `callback` parameter gets called if any of the events get triggered, the parameter `state` is an object containing the keys currently pressed as well as the mouse location and status, granted that those events are being listened to.

If an input is not being listened to by Multyx, any changes will not show up in the controller state.

Server:
```js
multyx.on('connect', client => {
    // ... i aint writing allat

    client.controller.listenTo([
        Multyx.Input.UpArrow,
        Multyx.Input.DownArrow,
        Multyx.Input.LeftArrow,
        Multyx.Input.RightArrow
    ]);

    client.onUpdate = (deltaTime, controllerState) => {
        const x = player.get('position').get('x');
        const y = player.get('position').get('y');

        const speed = deltaTime * 200;

        if(controllerState.keys[Multyx.Input.UpArrow]) y.set(y.value - speed);
        if(controllerState.keys[Multyx.Input.DownArrow]) y.set(y.value + speed);
        if(controllerState.keys[Multyx.Input.LeftArrow]) x.set(x.value - speed);
        if(controllerState.keys[Multyx.Input.RightArrow]) x.set(x.value + speed);
    }
});
```
Client:
```js
// imagine you are holding right arrow
console.log(player.position.x); // 193.53
// imagine a frame just passed
console.log(player.position.x); // 204.81
// omg it worked
```

### Add Linear Interpolation
The `Multyx.Lerp` function takes in 2 required arguments and linearly interpolates between the current value and previous value based on the time since the current value was updated. Lerp is the go-to interpolation method and creates extremely smooth animations between one frame to the next, however is delayed by half a frame (25ms) on average.

`Multyx.Lerp(object: { [key: string]: any }, property: string)`

Client:
```js
// Add interpolation onto all current clients
multyx.on(Multyx.Start, () => {
    for(const client of Object.values(multyx.clients)) {
        Multyx.Lerp(client.player.position, "x");
        Multyx.Lerp(client.player.position, "y");
    }
});

// Add interpolation onto all future clients
multyx.on(Multyx.Connection, client => {
    Multyx.Lerp(client.player.position, "x");
    Multyx.Lerp(client.player.position, "y");
});
```

### Standardize Mouse Position
Standardizing the mouse position utilizes the `controller.mapMousePosition` function, which takes in 1 required argument and 4 optional arguments.

`controller.mapMousePosition(anchor: HTMLElement, centerX?: number, centerY?: number, scaleX?: number, scaleY?: number)`

The `anchor` parameter tells Multyx which element the mouse should be measured relative to. For almost all purposes this is the canvas element, and by default the x and y-value of the mouse is the distance from the top-left corner (0, 0) of the element, measured in the element's relative coordinates. If the canvas size is altered in the client-side code, the mouse will be measured based not by pixels but by the canvas's relative size.

The `centerX` and `centerY` default to 0, and describe the point on the `anchor` element that corresponds to the mouse's origin - where x = 0 and y = 0.

The `scaleX` and `scaleY` default to 1, and describe the ratio between the number of units moved relative to the `anchor` element's coordiantes and the units moved relative to the mouse's coordinates. If only `scaleX` is defined, `scaleY` will default to `scaleX`.

Server:
```js
multyx.on('connect', client => {
    // ... i aint writing allat

    client.controller.listenTo(Multyx.Input.MouseMove, (controllerState) => {
        console.log(controllerState.mouse);
    });
});
```
Client:
```js
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 2000;
canvas.height = window.innerHeight / window.innerWidth * canvas.width;
ctx.translate(200, 200);
ctx.scale(1, -1);

const multyx = new Multyx();

multyx.controller.mapMousePosition(canvas, 200, 200, 1, -1);
```
Server Output:
```
> { x: 108, y: 294, down: false }
// imagine that the mouse is mapped now
> { x: -92, y: -94, down: false }
```