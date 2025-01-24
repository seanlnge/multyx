import Multyx from '../../server/dist/index';

const multyx = new Multyx.MultyxServer(() => console.log('multyx running'));

multyx.on(Multyx.Events.Connect, ({ self, controller }) => {
    self.color = '#' + Math.floor(Math.random() * (16**3)/2 + 8*16**2).toString(16);
    self.direction = 0;
    self.x = Math.round(Math.random() * 600);
    self.y = Math.round(Math.random() * 600);

    self.addPublic(multyx.all).disable();
    self.x.min(0).max(1000);
    self.y.min(0).max(1000);

    controller.listenTo(Multyx.Input.MouseMove);
});

multyx.on(Multyx.Events.Update, () => {
    for(const { self, controller } of multyx.all.clients) {
        // Set player direction to mouse direction
        self.direction = Math.atan2(
            controller.state.mouse.y - self.y,
            controller.state.mouse.x - self.x
        );

        // Stop movement if player on top of mouse
        if(Math.hypot(
            controller.state.mouse.x - self.x,
            controller.state.mouse.y - self.y
        ) < 20) {
            self.x = controller.state.mouse.x;
            self.y = controller.state.mouse.y;
            continue;
        }

        // Move player in direction of mouse
        self.x += 200 * Math.cos(self.direction) * multyx.deltaTime;
        self.y += 200 * Math.sin(self.direction) * multyx.deltaTime;
    }
});