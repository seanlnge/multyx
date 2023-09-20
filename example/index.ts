import Multyx from "../server/dist/index.js";
import * as express from 'express';

const server = express().listen(8080, () => console.log('server started'));
const multyx = new Multyx.MultyxServer(server);

// @ts-ignore
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