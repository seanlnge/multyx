import Multyx from '../../server/dist/index';

const multyx = new Multyx.MultyxServer();

multyx.on(Multyx.Events.Connect, ({ self, controller }) => {
    self.color = '#' + Math.floor(Math.random() * 3840 + 256).toString(16);
    self.direciton = 0;
    self.x = Math.round(Math.random() * 1000);
    self.y = Math.round(Math.random() * 1000);

    self.public().disable();
    self.position.x.min(0).max(1000);
    self.position.y.min(0).max(1000);

    controller.listenTo(Multyx.Input.MouseMove, state => {
        self.direction = Math.atan2(
            state.mouse.y - self.y,
            state.mouse.x - self.x
        );
    });
});

multyx.on(Multyx.Events.Update, () => {
    for(const { self } of multyx.all.clients) {
        self.x += 200 * Math.cos(self.direction) * multyx.deltaTime;
        self.y += 200 * Math.sin(self.direction) * multyx.deltaTime;
    }
});