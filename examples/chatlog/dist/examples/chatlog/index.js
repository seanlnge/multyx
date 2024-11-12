"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../../server/index"));
const express_1 = __importDefault(require("express"));
const server = (0, express_1.default)().listen(8080, () => console.log('server started'));
const multyx = new index_1.default.MultyxServer(server);
multyx.all.self.set('messages', []);
multyx.all.self.get('messages').allowItemChange = false;
multyx.all.self.get('messages').allowItemDeletion = false;
multyx.on(index_1.default.Events.Connect, (client) => {
    multyx.all.self.get('messages').push(client.uuid + ' joined');
});
multyx.on(index_1.default.Events.Edit, () => {
    console.log(multyx.all.self.get('messages'));
});
