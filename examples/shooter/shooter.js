"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const src_1 = require("../../server/dist/src");
const server = (0, express_1.default)().listen(8080, () => console.log('server started'));
const multyx = new src_1.MultyxServer(server);
const activePlayers = new src_1.MultyxTeam("players");
activePlayers.self.bullets = [];
multyx.on(src_1.Events.Connect, client => client.self.disable());
multyx.on("join", (client, name) => {
    if (activePlayers.getClient(client.uuid) !== null)
        return false;
    if (typeof name !== "string")
        return false;
    if (Array.from(activePlayers.clients).find(x => x.self.name == name))
        return false;
    activePlayers.addClient(client);
    client.self.name = name;
    client.self.x = Math.random() * 2000 - 1000;
    client.self.y = Math.random() * 2000 - 1000;
    client.self.health = 100;
    client.self.deaths = 0;
    client.self.speed = 100;
    client.self.bulletDamage = 20;
    client.self.bulletSpeed = 300;
    client.controller.listenTo(["w", "a", "s", "d"]);
    client.self.x.min(-1000).max(1000);
    client.self.y.min(-1000).max(1000);
    client.controller.listenTo(src_1.Input.MouseDown, (state) => {
        if (!state.mouse.down)
            return;
        const direction = Math.atan2(state.mouse.y - client.self.y, state.mouse.x - client.self.x);
        const speed = client.self.bulletSpeed;
        const speedX = Math.cos(direction) * speed;
        const speedY = Math.sin(direction) * speed;
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
multyx.on(src_1.Events.Update, () => {
    for (const { self, controller } of activePlayers.clients) {
        if (controller.state.keys["w"])
            self.y += self.speed * multyx.deltaTime;
        if (controller.state.keys["a"])
            self.x -= self.speed * multyx.deltaTime;
        if (controller.state.keys["s"])
            self.y -= self.speed * multyx.deltaTime;
        if (controller.state.keys["d"])
            self.x += self.speed * multyx.deltaTime;
    }
    /*
        const bullets = activePlayers.self.bullets;
    
        for(let i=0; i<bullets.length; i++) {
            // Bullet went out of bounds
            if(Math.abs(bullets[i].x) > 1000
            || Math.abs(bullets[i].y) > 1000) {
                bullets.splice(i--, 1);
            }
    
            for(const { uuid, self } of activePlayers.clients) {
                if(bullets.client === uuid) continue;
    
                const dx = Math.abs(self.x - bullets[i].x);
                const dy = Math.abs(self.y - bullets[i].y);
    
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
                }
            }
        } */
});
