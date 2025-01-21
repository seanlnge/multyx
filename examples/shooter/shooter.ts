import express from 'express';
import {
    MultyxServer,
    MultyxTeam,
    Events,
    Input
} from '../../server/dist/src';

const server = express().listen(8080, () => console.log('server started'));
const multyx = new MultyxServer(server, { tps: 4 });

const activePlayers = new MultyxTeam("players");
activePlayers.self.bullets = [];

// Disallow changing of client values by the client
// All client movement can be computed by the server
multyx.on(Events.Connect, client => client.self.disable());

multyx.on("join", (client, name) => {
    // Ensure client name is not null, and does not already exist
    if(activePlayers.getClient(client.uuid) !== null) return false;
    if(typeof name !== "string") return false;
    if(Array.from(activePlayers.clients).find(x => x.self.name == name)) return false;

    // Add client to MultyxTeam of active players
    activePlayers.addClient(client);

    // Allow all active players to see self information
    client.self.addPublic(activePlayers);

    client.self.name = name;
    client.self.x = Math.random() * 2000 - 1000;
    client.self.y = Math.random() * 2000 - 1000;
    client.self.health = 100;
    client.self.deaths = 0;
    client.self.speed = 100;
    client.self.bulletDamage = 20;
    client.self.bulletSpeed = 300;
    
    // Make client send event if pressing these keys
    client.controller.listenTo(["w", "a", "s", "d"]);

    // Constrain client inside box
    client.self.x.min(-1000).max(1000);
    client.self.y.min(-1000).max(1000);

    // Event to listen for shooting
    client.controller.listenTo(Input.MouseDown, (state) => {
        const direction = Math.atan2(
            state.mouse.y - client.self.y,
            state.mouse.x - client.self.x
        );
    
        // Get cartesian values of speed
        const speed = client.self.bulletSpeed;
        const speedX = Math.cos(direction) * speed;
        const speedY = Math.sin(direction) * speed;
        
        // Create a new bullet and push it to the activePlayers public object
        activePlayers.self.bullets.push({
            x: client.self.x,
            y: client.self.y,
            client: client.uuid,
            damage: client.self.bulletDamage,
            speedX, speedY,
        });
    });

    return true;
});

// Runs every update before information gets broadcast to clients
multyx.on(Events.Update, () => {
    for(const { self, controller } of activePlayers.clients) {
        if(controller.state.keys["w"]) self.y += self.speed * multyx.deltaTime;
        if(controller.state.keys["a"]) self.x -= self.speed * multyx.deltaTime;
        if(controller.state.keys["s"]) self.y -= self.speed * multyx.deltaTime;
        if(controller.state.keys["d"]) self.x += self.speed * multyx.deltaTime;
    }

    const bullets = activePlayers.self.bullets;

    for(let i=0; i<bullets.length; i++) {
        bullets[i].x += bullets[i].speedX * multyx.deltaTime;
        bullets[i].y += bullets[i].speedY * multyx.deltaTime;

        // Bullet went out of bounds
        if(Math.abs(bullets[i].x) > 1000
        || Math.abs(bullets[i].y) > 1000) {
            bullets.splice(i--, 1);
            continue;
        }

        // Check for collisions between bullet and all clients
        for(const { uuid, self } of activePlayers.clients) {
            // Bullet can't hit same person who shot it
            if(bullets.client === uuid) continue;

            const dx = self.x - bullets[i].x;
            const dy = self.y - bullets[i].y;

            // Center of bullet is less than 10 units from center of player
            if(dx**2 + dy**2 < 10**2) {
                self.health -= bullets[i].damage;

                // Alter player's stats and reset position and health
                if(self.health <= 0) {
                    self.health = 100;
                    self.x = Math.random() * 2000 - 1000;
                    self.y = Math.random() * 2000 - 1000;
                    self.deaths++;
                }
                bullets.splice(i--, 1);
                break;
            }
        }
    }
});