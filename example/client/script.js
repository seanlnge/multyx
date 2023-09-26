const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 2000;
canvas.height = window.innerHeight / window.innerWidth * canvas.width;
ctx.translate(200, 200);
ctx.scale(1, -1);

const multyx = new Multyx();

multyx.on(Multyx.Start, () => {
    window.player = multyx.shared.player;
    requestAnimationFrame(update);

    for(const client of Object.values(multyx.clients)) {
        Multyx.Lerp(client.player.position, "x");
        Multyx.Lerp(client.player.position, "y");
    }

    multyx.controller.mapMousePosition(canvas, 200, 200, 1, -1);
});

multyx.on(Multyx.Connection, client => {
    Multyx.Lerp(client.player.position, "x");
    Multyx.Lerp(client.player.position, "y");
});

function update() {
    ctx.clearRect(-200, -200, canvas.width, canvas.height);
    for(const { player } of Object.values(multyx.clients)) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.position.x - player.size/2, player.position.y - player.size/2, player.size, player.size);
    }
    requestAnimationFrame(update);
}