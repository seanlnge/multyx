const Multyx = require('../../server/dist/index').default;
const multyx = new Multyx.MultyxServer(() => console.log('server started'));

const game = new Multyx.MultyxTeam("game");

game.self.messages = [];
game.self.disable();

game.self.orange = {
    health: 5000,
    players: [],
    bullets: [],
};

game.self.green = {
    health: 5000,
    players: [],
    bullets: [],
};

multyx.on(Multyx.Events.Disconnect, client => {
    const index = game.self[client.self.team].players.findIndex(c => c == client.uuid);
    game.self[client.self.team].players.splice(index, 1);
});

const orange = game.self.orange;
const green = game.self.green;

const bulletTypes = [
    { damage: 2, speed: 35 },
    { damage: 10, speed: 30 },
    { damage: 20, speed: 30 },
    { damage: 50, speed: 25 },
    { damage: 100, speed: 20 }
];


multyx.on(Multyx.Events.Connect, (client) => {
    const { self, uuid, controller } = client;

    const maxPlayers = Math.max(game.self.green.players.length, game.self.orange.players.length);
    self.team = maxPlayers == game.self.green.players.length ? 'orange' : 'green';

    self.x = self.team == 'orange' ? -250 : 250;
    self.y = 0;
    self.vy = 0;
    self.angle = 0;
    self.coins = 10;
    self.lastShot = 0;
    self.health = 100;
    self.inventorySlot = 1;

    self.x.min(-269).max(269).addPublic(game);
    self.y.min(-6).addPublic(game);
    self.health.min(0).max(100).addPublic(game);
    self.team.addPublic(game);

    self.disable();
    self.inventorySlot.enable().min(0).max(4).int();

    game.addClient(client);
    game.self[self.team].players.push(uuid);
    game.self.messages.push(uuid + ' joined ' + self.team + ' team!');

    controller.listenTo([Multyx.Input.LeftShift, 'a', 'd']);

    controller.listenTo(Multyx.Input.Space, () => {
        if(client.self.y == -6) client.self.vy = 20;
    });

    controller.listenTo(['1', '2', '3', '4', '5'], (state) => {
        if(state.keys['1']) self.inventorySlot = 0;
        if(state.keys['2']) self.inventorySlot = 1;
        if(state.keys['3']) self.inventorySlot = 2;
        if(state.keys['4']) self.inventorySlot = 3;
        if(state.keys['5']) self.inventorySlot = 4;
    });

    controller.listenTo(Multyx.Input.MouseDown, (state) => {
        const { speed, damage } = bulletTypes[self.inventorySlot];
        
        self.angle = Math.atan2(state.mouse.y - self.y, state.mouse.x - self.x);

        game.self[self.team].bullets.push({
            x: self.x,
            y: self.y,
            team: self.team,
            vx: Math.cos(self.angle) * speed,
            vy: Math.sin(self.angle) * speed,
            gravity: 5 * Math.cbrt(self.inventorySlot) + 5,
            damage: damage,
            shooter: uuid,
            type: self.inventorySlot,
            angle: self.angle
        });
    });
});

function respawn(client) {
    client.self.x = client.self.team === "orange" ? -250 : 250;
    client.self.y = 0;
    client.self.vy = 0;
    client.self.angle = 0;
    client.self.coins = 10;
    client.self.lastShot = 0;
    client.self.health = 100;
}

multyx.on(Multyx.Events.Update, () => {
    for(const client of game.clients) {
        let speed = 12.5;
        
        if(client.controller.state.keys[Multyx.Input.LeftShift]) {
            speed *= 1.5;
            client.self.health -= 5 * multyx.deltaTime;
            if(client.self.health == 0) {
                respawn(client);
                continue;
            }
        }

        if(client.controller.state.keys['a']) client.self.x -= speed * multyx.deltaTime;
        if(client.controller.state.keys['d']) client.self.x += speed * multyx.deltaTime;

        if(client.self.y != -6 || client.self.vy > 0) {
            client.self.vy -= 40 * multyx.deltaTime;
            client.self.y += client.self.vy * multyx.deltaTime;
        }

        client.self.health += 5 * multyx.deltaTime;
    }

    for(let i=0; i<orange.bullets.length; i++) {
        const bullet = orange.bullets[i];
        if(!bullet) continue;

        bullet.vy -= bullet.gravity * multyx.deltaTime;
        bullet.x += bullet.vx * multyx.deltaTime;
        bullet.y += bullet.vy * multyx.deltaTime;

        if(bullet.x > 269) {
            green.health -= bullet.damage;
            orange.bullets.delete(i);
            continue;
        }

        if(bullet.x < -269 || bullet.y < -10) {
            orange.bullets.delete(i);
            continue;
        }

        for(const uuid of green.players) {
            const client = game.getClient(uuid);
            const xDist = Math.abs(client.self.x - bullet.x);
            const yDist = Math.abs(client.self.y - bullet.y);

            if(xDist <= 2 && yDist <= 2) {
                client.self.health -= bullet.damage;

                if(client.self.health == 0) {
                    respawn(client);
                    game.getClient(bullet.shooter).coins += 5;
                    game.self.messages.push(`${client.uuid} died to ${bullet.shooter}'s bullet`);
                    orange.bullets.delete(i);
                    break;
                }
            }
        }
    }

    for(let i=0; i<green.bullets.length; i++) {
        const bullet = green.bullets[i];
        if(!bullet) continue;

        bullet.vy -= bullet.gravity * multyx.deltaTime;
        bullet.x += bullet.vx * multyx.deltaTime;
        bullet.y += bullet.vy * multyx.deltaTime;

        if(bullet.x < -269) {
            orange.health -= bullet.damage;
            green.bullets.delete(i);
            continue;
        }

        if(bullet.x > 269 || bullet.y < -6) {
            green.bullets.delete(i);
            continue;
        }

        for(const uuid of orange.players) {
            const client = game.getClient(uuid);
            const xDist = Math.abs(client.self.x - bullet.x);
            const yDist = Math.abs(client.self.y - bullet.y);

            if(xDist <= 1 && yDist <= 1) {
                client.self.health -= bullet.damage;

                if(client.self.health == 0) {
                    respawn(client);
                    game.getClient(bullet.shooter).coins += 5;
                    game.messages.push(`${client.uuid} died to ${bullet.shooter}'s bullet`);
                    green.bullets.delete(i);
                    break;
                }
            }
        }
    }

    if(orange.health == 0) game.self.messages.push('Game over! Green won!');
    if(green.health == 0) game.self.messages.push('Game over! Orange won!');
    game.self.messages = [...game.self.messages].slice(0, -4);
});