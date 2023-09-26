import Multyx from "multyx";
import express from 'express';

const server = express().listen(8080, () => console.log('server started'));
const multyx = new Multyx.MultyxServer(server);

multyx.on('connect', (client: Multyx.Client) => {
    client.shared.set("player", {
        color: '#' + Math.floor(Math.random() * 3840 + 256).toString(16),
        size: 10,
        direction: 0,
        position: {
            x: Math.round(Math.random() * 400) - 200,
            y: Math.round(Math.random() * 400) - 200
        }
    });

    const player = client.shared.get("player");
    player.public().disable();
    player.get('size').min(5).max(80);
    player.get('position').get('x').min(-200).max(200);
    player.get('position').get('y').min(-200).max(200);

    client.controller.listenTo([
        Multyx.Input.MouseMove,
        Multyx.Input.UpArrow,
        Multyx.Input.DownArrow
    ]);

    client.onUpdate = (dt, state) => {
        const x = player.get('position').get('x');
        const y = player.get('position').get('y');
        
        player.get('direction').set(Math.atan2(
            state.mouse.y - y.value,
            state.mouse.x - x.value
        ));

        if(state.keys[Multyx.Input.UpArrow]) player.get('size').set(player.raw.size + 40 * dt);
        if(state.keys[Multyx.Input.DownArrow]) player.get('size').set(player.raw.size - 40 * dt);

        x.set(x.value + dt * (3000 / player.raw.size) * Math.cos(player.raw.direction));
        y.set(y.value + dt * (3000 / player.raw.size) * Math.sin(player.raw.direction));
    };
});