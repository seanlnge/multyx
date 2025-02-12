const Multyx = require("multyx");

const multyx = new Multyx.MultyxServer(() => console.log('started'));

multyx.on(Multyx.Events.Connect, ({ self, controller }) => {
    self.color = '#'
        + Math.floor(Math.random() * 8)
        + Math.floor(Math.random() * 8)
        + Math.floor(Math.random() * 8);

    self.direction = 0;
    self.x = Math.round(Math.random() * 600);
    self.y = Math.round(Math.random() * 600);

    self.addPublic(multyx.all).disable();
    self.x.min(0).max(600);
    self.y.min(0).max(600);

    controller.listenTo(Multyx.Input.MouseMove);
});

multyx.on(Multyx.Events.Update, () => {
    for(const { self, controller } of multyx.all.clients) {
        // Set player direction to mouse direction
        self.direction = Math.atan2(
            controller.state.mouse.y - self.y,
            controller.state.mouse.x - self.x
        );

        // Make the speed proportional to distance
        const distance = Math.hypot(
            controller.state.mouse.x - self.x,
            controller.state.mouse.y - self.y
        );

        // Have a maximum speed of 200
        const speed = Math.min(200, distance);
        if(speed < 0.1) continue;

        // Move player in direction of mouse
        self.x += speed * Math.cos(self.direction) * multyx.deltaTime;
        self.y += speed * Math.sin(self.direction) * multyx.deltaTime;
    }
});