"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../../server/dist/index"));
const multyx = new index_1.default.MultyxServer();
multyx.on(index_1.default.Events.Connect, ({ self, controller }) => {
    self.color = '#' + Math.floor(Math.random() * 3840 + 256).toString(16);
    self.direciton = 0;
    self.x = Math.round(Math.random() * 1000);
    self.y = Math.round(Math.random() * 1000);
    self.public().disable();
    self.position.x.min(0).max(1000);
    self.position.y.min(0).max(1000);
    controller.listenTo(index_1.default.Input.MouseMove, state => {
        self.direction = Math.atan2(state.mouse.y - self.y, state.mouse.x - self.x);
    });
});
multyx.on(index_1.default.Events.Update, () => {
    for (const { self } of multyx.all.clients) {
        self.x += 200 * Math.cos(self.direction) * multyx.deltaTime;
        self.y += 200 * Math.sin(self.direction) * multyx.deltaTime;
    }
});
