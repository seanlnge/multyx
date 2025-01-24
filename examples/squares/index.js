"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../../server/dist/index"));
const multyx = new index_1.default.MultyxServer({ websocketOptions: {
        perMessageDeflate: false
    } }, () => console.log('multyx running'));
multyx.on(index_1.default.Events.Connect, ({ self, controller }) => {
    self.color = '#' + Math.floor(Math.random() * (16 ** 3) / 2 + 8 * 16 ** 2).toString(16);
    self.direction = 0;
    self.x = Math.round(Math.random() * 600);
    self.y = Math.round(Math.random() * 600);
    self.addPublic(multyx.all).disable();
    self.x.min(0).max(1000);
    self.y.min(0).max(1000);
    controller.listenTo(index_1.default.Input.MouseMove);
});
let prev = Date.now();
multyx.on(index_1.default.Events.Update, () => {
    if (Date.now() - prev > 2000) {
        prev = Date.now();
        console.log(process.memoryUsage());
    }
    for (const { self, controller } of multyx.all.clients) {
        // Set player direction to mouse direction
        self.direction = Math.atan2(controller.state.mouse.y - self.y, controller.state.mouse.x - self.x);
        // Stop movement if player on top of mouse
        if (Math.hypot(controller.state.mouse.x - self.x, controller.state.mouse.y - self.y) < 20) {
            self.x = controller.state.mouse.x;
            self.y = controller.state.mouse.y;
            continue;
        }
        // Move player in direction of mouse
        self.x += 200 * Math.cos(self.direction) * multyx.deltaTime;
        self.y += 200 * Math.sin(self.direction) * multyx.deltaTime;
    }
});
