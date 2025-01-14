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
        return;
    if (typeof name !== "string")
        name = (Math.random() * 36 ** 4).toString(36);
    client.self.name = name;
    activePlayers.addClient(client);
    client.self.enable();
    client.self.x = Math.random() * 1000;
    client.self.y = Math.random() * 1000;
    client.self.health = 100;
    client.self.deaths = 0;
    client.self.speed = 100;
    client.self.bulletDamage = 20;
    client.self.bulletSpeed = 300;
    client.controller.listenTo(["w", "a", "s", "d", src_1.Input.MouseDown]);
    client.self.x.min(0).max(1000);
    client.self.y.min(0).max(1000);
});
multyx.on(src_1.Events.Input, ({ controller, self, uuid }) => {
    if (!controller.state.mouse.down)
        return;
    const direction = Math.atan2(controller.state.mouse.y - self.y.value, controller.state.mouse.x - self.x.value);
    if (!activePlayers.getClient(uuid))
        return;
    const speed = self.bulletSpeed.value;
    const speedX = Math.cos(direction) * speed;
    const speedY = Math.sin(direction) * speed;
    activePlayers.self.bullets.push({
        x: self.x.value,
        y: self.y.value,
        client: uuid,
        damage: self.bulletDamage.value,
        speedX, speedY,
    });
});
multyx.on(src_1.Events.Update, () => {
    for (const { self, controller } of activePlayers.clients) {
        if (controller.state.keys["w"])
            self.y += self.speed.value * multyx.deltaTime;
        if (controller.state.keys["a"])
            self.x -= self.speed.value * multyx.deltaTime;
        if (controller.state.keys["s"])
            self.y -= self.speed.value * multyx.deltaTime;
        if (controller.state.keys["d"])
            self.x += self.speed.value * multyx.deltaTime;
    }
    const bullets = activePlayers.self.bullets;
    for (let i = 0; i < bullets.length; i++) {
        if (Math.abs(bullets[i].x.value) > 1000
            || Math.abs(bullets[i].y.value) > 1000) {
            bullets.splice(i--, 1);
        }
        for (const { uuid, self } of activePlayers.clients) {
            if (bullets.client === uuid)
                continue;
            const dx = Math.abs(self.x.value - bullets[i].x.value);
            const dy = Math.abs(self.y.value - bullets[i].y.value);
            if (dx ** 2 + dy ** 2 < 10 ** 2) {
                self.health -= bullets[i].damage.value;
                if (self.health.value - bullets[i].damage.value <= 0) {
                    self.health = 100;
                    self.x = Math.random() * 1000;
                    self.y = Math.random() * 1000;
                    self.deaths++;
                }
                bullets.splice(i--, 1);
            }
        }
    }
});
