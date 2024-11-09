"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var multyx_1 = require("multyx");
var express_1 = require("express");
var server = (0, express_1.default)().listen(8080, function () { return console.log('server started'); });
var multyx = new multyx_1.default.MultyxServer(server);
multyx.on('connect', function (client) {
    client.shared.set("player", {
        color: '#' + Math.floor(Math.random() * 3840 + 256).toString(16),
        size: 10,
        direction: 0,
        position: {
            x: Math.round(Math.random() * 400) - 200,
            y: Math.round(Math.random() * 400) - 200
        }
    });
    var player = client.shared.get("player");
    player.public().disable();
    player.get('size').min(5).max(80);
    player.get('position').get('x').min(-200).max(200);
    player.get('position').get('y').min(-200).max(200);
    client.controller.listenTo([
        multyx_1.default.Input.MouseMove,
        multyx_1.default.Input.UpArrow,
        multyx_1.default.Input.DownArrow
    ]);
    client.onUpdate = function (dt, state) {
        var x = player.get('position').get('x');
        var y = player.get('position').get('y');
        player.get('direction').set(Math.atan2(state.mouse.y - y.value, state.mouse.x - x.value));
        if (state.keys[multyx_1.default.Input.UpArrow])
            player.get('size').set(player.raw.size + 40 * dt);
        if (state.keys[multyx_1.default.Input.DownArrow])
            player.get('size').set(player.raw.size - 40 * dt);
        x.set(x.value + dt * (3000 / player.raw.size) * Math.cos(player.raw.direction));
        y.set(y.value + dt * (3000 / player.raw.size) * Math.sin(player.raw.direction));
    };
});
