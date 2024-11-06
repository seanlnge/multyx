import Multyx from '../server/index';
import express from 'express';

const server = express().listen(8080, () => console.log('server started'));
const multyx = new Multyx.MultyxServer(server);

multyx.on('connect', (client: Multyx.Client) => {
    client.self.set("player", {
        color: '#' + Math.floor(Math.random() * 3840 + 256).toString(16),
        size: 40,
        direction: 0,
        position: {
            x: Math.round(Math.random() * 1000) - 500,
            y: Math.round(Math.random() * 1000) - 500
        }
    });
    const player = client.self.get("player");
    player.public().disable();
    player.get('size').min(20).max(200);
    player.get('position').get('x').min(-500).max(500).lerp();
    player.get('position').get('y').min(-500).max(500).lerp();

    client.controller.listenTo([
        Multyx.Input.MouseMove,
        Multyx.Input.UpArrow,
        Multyx.Input.DownArrow
    ]);

    client.onUpdate = (dt, controller) => {
        const x = player.get('position').get('x');
        const y = player.get('position').get('y')
        
        player.get('direction').set(Math.atan2(
            controller.mouse.y - y.value,
            controller.mouse.x - x.value
        ));

        if(controller.keys[Multyx.Input.UpArrow]) player.get('size').set(player.raw.size + 40 * dt);
        if(controller.keys[Multyx.Input.DownArrow]) player.get('size').set(player.raw.size - 40 * dt);

        x.set(x.value + dt * (6000 / player.raw.size) * Math.cos(player.raw.direction));
        y.set(y.value + dt * (6000 / player.raw.size) * Math.sin(player.raw.direction));
    };
});