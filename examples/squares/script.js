const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const multyx = new Multyx();

multyx.controller.mapCanvasPosition(canvas, { top: 600, anchor: 'bottomleft' });
multyx.controller.mapMouseToCanvas(canvas);

multyx.loop(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(const player of Object.values(multyx.clients)) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x - 10, player.y - 10, 20, 20);
    }
});

multyx.forAll(client => {
    client.x.Lerp();
    client.y.Lerp();
});