"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const multyx_1 = require("../../server/dist/index");
const multyx = new multyx_1.default.MultyxServer(() => console.log("Game 14 started at " + new Date().toISOString()));
const _multyx = { codes: {}, nodes: {}, events: [], verify: () => { } };
_multyx.verify = (condition, data = {}) => {
    if (condition.state === "update")
        return [{ [condition.uuid]: { state: "update", data } }];
    const node = _multyx.nodes[condition.uuid];
    const events = _multyx.events[condition.uuid];
    if (!events || !node)
        return [];
    const results = [];
    const getResult = (s, d) => {
        const valid = condition.positive === s;
        if (condition.and && valid)
            return _multyx.verify(condition.and, d);
        if (condition.or && !valid)
            return _multyx.verify(condition.or, {});
        return valid ? [d] : [];
    };
    for (const event of events) {
        const state = event.state === condition.state || condition.state === "truthy";
        const result = getResult(state, { [condition.uuid]: event });
        if (result.length)
            results.push(...result);
    }
    return results;
};
function Distance(object1, object2) {
    // Function: Distance
    // Add your function logic here
    return Math.hypot(object1.x - object2.x, object1.y - object2.y);
}
_multyx.nodes["4e24c311-f38b-4143-93f8-e3dfe5256c3e"] = { type: "function", reference: Distance };
_multyx.codes["6446f503-fe7f-4cee-a9bc-e8cb3ac179e3"] = Distance;
_multyx.nodes["b436f523-178c-455c-b078-799401e88032"] = { type: "client", reference: "b436f523-178c-455c-b078-799401e88032", initialize: () => {
        multyx.on(multyx_1.default.Events.Connect, (client) => {
            _multyx.events["b436f523-178c-455c-b078-799401e88032"].push({ state: "join", client });
            client.controller.listenTo("mousedown", () => _multyx.events["b436f523-178c-455c-b078-799401e88032"].push({ state: "mousedown", client }));
            client.controller.listenTo("mousemove", () => _multyx.events["b436f523-178c-455c-b078-799401e88032"].push({ state: "mousemove", client }));
        });
        multyx.on(multyx_1.default.Events.Disconnect, (client) => {
            _multyx.events["b436f523-178c-455c-b078-799401e88032"].push({ state: "leave", client });
        });
    } };
const Engine = new multyx_1.default.MultyxTeam("Engine");
(() => {
    _multyx.nodes["6d481536-1649-498b-9242-83e8413630e7"] = { type: "team", reference: Engine };
    const original = Engine.addClient.bind(Engine);
    Engine.addClient = (...args) => { original(...args); _multyx.events["6d481536-1649-498b-9242-83e8413630e7"]["join"] = args; };
    const original2 = Engine.removeClient.bind(Engine);
    Engine.removeClient = (...args) => { original2(...args); _multyx.events["6d481536-1649-498b-9242-83e8413630e7"]["leave"] = args; };
})();
function GetMouseAngle(client) {
    // Find angle between mouse and client
    return Math.atan2(client.controller.state.mouse.y - client.self.y, client.controller.state.mouse.x - client.self.x);
}
_multyx.nodes["886403c5-6af7-4c3e-a17a-01ca24d1e2e4"] = { type: "function", reference: GetMouseAngle };
_multyx.codes["67ecc92e-339e-457b-9882-5da1ea9ac86d"] = GetMouseAngle;
_multyx.codes["fa63d8a9-5353-4050-9696-7ba20c0fa48d"] = (Client) => {
    if (Client.self.health <= 0)
        return true;
    return false;
};
_multyx.nodes["e1b36c56-f808-4729-a396-ef7495dc21d9"] = {
    type: "state",
    reference: _multyx.codes["fa63d8a9-5353-4050-9696-7ba20c0fa48d"],
    update: () => {
        multyx.all.clients.map(c => ({ state: _multyx.codes["fa63d8a9-5353-4050-9696-7ba20c0fa48d"](c), client: c })).filter(c => !!c.state).forEach(d => _multyx.events["e1b36c56-f808-4729-a396-ef7495dc21d9"].push(d));
    },
    initialize: () => {
    }
};
_multyx.codes["087fb156-c3f0-45b5-9390-b7cd9cbb52f0"] = async (_multyxData) => {
    const Client = _multyxData["b436f523-178c-455c-b078-799401e88032"].client;
    (() => {
        const c = Client;
        if (Array.isArray(c))
            c.forEach(cli => cli.setSpace("d6ce2cb9-82ed-48b5-b2a1-c7979a87d32c"));
        else
            c.setSpace("d6ce2cb9-82ed-48b5-b2a1-c7979a87d32c");
    })();
};
_multyx.nodes["087fb156-c3f0-45b5-9390-b7cd9cbb52f0"] = { reference: _multyx.codes["087fb156-c3f0-45b5-9390-b7cd9cbb52f0"], type: "trigger", update: () => { _multyx.verify({ "or": null, "and": null, "uuid": "b436f523-178c-455c-b078-799401e88032", "state": "join", "positive": true }).forEach(data => _multyx.codes["087fb156-c3f0-45b5-9390-b7cd9cbb52f0"](data)); } };
multyx.on("joinGame", async (Client, username) => {
    await Promise.resolve(_multyx.nodes["6d481536-1649-498b-9242-83e8413630e7"].reference["addClient"](Client));
    await Promise.resolve((() => {
        // Initialize player setup
        Client.self.x = Math.random() * 600;
        Client.self.y = Math.random() * 600;
        Client.self.health = 100;
        Client.self.color = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
        Client.self.name = username;
        // Set bounds for the player
        Client.self.x.min(0).max(600);
        Client.self.y.min(0).max(600);
        // Share player info with all other players
        Engine.addPublic(Client.self);
    })());
    (() => {
        const c = Client;
        if (Array.isArray(c))
            c.forEach(cli => cli.setSpace("83652810-9928-4d0c-a737-6ea36b7ae01a"));
        else
            c.setSpace("83652810-9928-4d0c-a737-6ea36b7ae01a");
    })();
});
_multyx.codes["42258ef2-9b96-4f9f-872b-a75d8b21e928"] = async (_multyxData) => {
    await Promise.resolve((() => {
        // Initialize the team's bullet list
        Engine.self.bullets = [];
    })());
};
_multyx.nodes["42258ef2-9b96-4f9f-872b-a75d8b21e928"] = { reference: _multyx.codes["42258ef2-9b96-4f9f-872b-a75d8b21e928"], type: "trigger", initialize: () => { _multyx.codes["42258ef2-9b96-4f9f-872b-a75d8b21e928"](); } };
_multyx.codes["b3b09694-9f34-4d77-a8b4-a5fc885f9fe2"] = async (_multyxData) => {
    const Client = _multyxData["b436f523-178c-455c-b078-799401e88032"].client;
    const Result = await Promise.resolve((() => {
        const mouseAngle = GetMouseAngle(Client);
        const bulletSpeed = 250;
        // Add a bullet to the team's shared state
        Engine.self.bullets.push({
            x: Client.self.x,
            y: Client.self.y,
            speedX: Math.cos(mouseAngle) * bulletSpeed,
            speedY: Math.sin(mouseAngle) * bulletSpeed,
            owner: Client.uuid
        });
    })());
};
_multyx.nodes["b3b09694-9f34-4d77-a8b4-a5fc885f9fe2"] = { reference: _multyx.codes["b3b09694-9f34-4d77-a8b4-a5fc885f9fe2"], type: "trigger", update: () => { _multyx.verify({ "or": null, "and": null, "uuid": "b436f523-178c-455c-b078-799401e88032", "state": "mousedown", "positive": true }).forEach(data => _multyx.codes["b3b09694-9f34-4d77-a8b4-a5fc885f9fe2"](data)); } };
_multyx.codes["7eaa540f-3798-4553-895a-e1522f930e5f"] = async (_multyxData) => {
    for (const client of Engine.clients) {
        await Promise.resolve((() => {
            // Find angle between mouse position and player position
            const angle = GetMouseAngle(client);
            // Move 100 units per sec
            client.self.x += multyx.deltaTime * Math.cos(angle) * 100;
            client.self.y += multyx.deltaTime * Math.sin(angle) * 100;
        })());
    }
    for (const bullet of Engine.self.bullets) {
        await Promise.resolve((() => {
            // Move bullet at `bullet.speed` units per second
            // (multyx.deltaTime represents time passed since last frame)
            bullet.x += multyx.deltaTime * bullet.speedX;
            bullet.y += multyx.deltaTime * bullet.speedY;
        })());
        for (const client of Engine.clients) {
            if (bullet.owner !== client.uuid) {
                const dist = await Promise.resolve(_multyx.nodes["4e24c311-f38b-4143-93f8-e3dfe5256c3e"].reference(client.self, bullet));
                if (dist < 10) {
                    await Promise.resolve((() => {
                        // Find index of bullet in the bullet list
                        const index = Engine.self.bullets.findIndex(b => b == bullet);
                        // Delete the bullet from the list
                        Engine.self.bullets.splice(index, 1);
                        client.self.health -= 25;
                    })());
                }
            }
        }
    }
};
_multyx.nodes["7eaa540f-3798-4553-895a-e1522f930e5f"] = { reference: _multyx.codes["7eaa540f-3798-4553-895a-e1522f930e5f"], type: "trigger", update: () => { _multyx.verify({ "or": null, "and": null, "uuid": "6d481536-1649-498b-9242-83e8413630e7", "state": "update", "positive": true }).forEach(data => _multyx.codes["7eaa540f-3798-4553-895a-e1522f930e5f"](data)); } };
_multyx.codes["af9c638f-1fe8-46e1-b7f6-68d76f682970"] = async (_multyxData) => {
    const client = _multyxData["e1b36c56-f808-4729-a396-ef7495dc21d9"].client;
    (() => {
        const c = client;
        if (Array.isArray(c))
            c.forEach(cli => cli.setSpace("9887b6ed-ced2-496a-83b9-1c7b5ec37ac5"));
        else
            c.setSpace("9887b6ed-ced2-496a-83b9-1c7b5ec37ac5");
    })();
};
_multyx.nodes["af9c638f-1fe8-46e1-b7f6-68d76f682970"] = { reference: _multyx.codes["af9c638f-1fe8-46e1-b7f6-68d76f682970"], type: "trigger", update: () => { _multyx.verify({ "or": null, "and": null, "uuid": "e1b36c56-f808-4729-a396-ef7495dc21d9", "state": "truthy", "positive": true }).forEach(data => _multyx.codes["af9c638f-1fe8-46e1-b7f6-68d76f682970"](data)); } };
multyx.on(multyx_1.default.Events.Update, _ => {
    for (const n of Object.values(_multyx.nodes))
        n.update?.();
    Object.values(_multyx.events).forEach(e => e.length = 0);
});
Object.keys(_multyx.nodes).forEach(k => _multyx.events[k] = []);
Object.values(_multyx.nodes).forEach(n => n.initialize?.());
