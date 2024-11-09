"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../../server/index"));
const express_1 = __importDefault(require("express"));
const server = (0, express_1.default)().listen(8080, () => console.log('server started'));
const multyx = new index_1.default.MultyxServer(server);
multyx.on(index_1.default.Events.Connect, (client) => {
    client.self.set('messages', ['hello world']);
});
multyx.on(index_1.default.Events.Edit, (client, data) => {
    console.log(client.self.get('messages').raw);
});
