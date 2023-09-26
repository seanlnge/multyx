### Multyx
User friendly framework for turning singleplayer JS browser games into multiplayer ones
***
##### Connecting to Server:
Server:
```js
import Multyx from 'multyx';
import * as express from 'express';

const server = express().listen(8080, () => console.log('server started'));
const multyx = new Multyx.MultyxServer(server);
```
Client:
```js
const multyx = new Multyx();
```

##### Creating a Shared Object:
Server:
```js
multyx.on('connect', client => {
    client.shared.set("player", {
        color: { hue: Math.floor(Math.random() * 360), sat: 1, lig: 0.5 },
        position: {
            x: Math.round(Math.random() * 400),
            y: Math.round(Math.random() * 400)
        }
    });
});
```
Client:
```js
multyx.on(Multyx.Start, () => {
    window.player = multyx.client.player;
    requestAnimationFrame(update);
});

const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => delete keys[e.code]);

function update() {
    let x = 0;
    let y = 0;

    if(keys['ArrowLeft']) x -= 5;
    if(keys['ArrowRight']) x += 5;
    if(keys['ArrowUp']) y -= 5;
    if(keys['ArrowDown']) y += 5;

    player.position.x += x;
    player.position.y += y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(const { player } of Object.values(multyx.clients)) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.position.x, player.position.y, 20, 20);
    }
    requestAnimationFrame(update);
}
```

##### Adding Constraints on Shared Object
Server:
```js
multyx.on('connect', (client: Multyx.Client) => {
    client.shared.set("player", {
        color: { hue: Math.floor(Math.random() * 360), sat: 1, lig: 0.5 },
        position: {
            x: Math.round(Math.random() * 400),
            y: Math.round(Math.random() * 400)
        }
    });

    const player = client.shared.get("player");
    player.public();
    player.get('color').disable();
    player.get('position').get('x').min(0).max(400);
    player.get('position').get('y').min(0).max(400);
});
```