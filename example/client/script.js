const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 2000;
canvas.height = window.innerHeight / window.innerWidth * canvas.width;
ctx.translate(500, 500);
ctx.scale(1, -1);

const player = Multyx.self.player;

Multyx.on(Multyx.Start, () => {
    requestAnimationFrame(update);
    Multyx.controller.mapMousePosition(canvas, 500, 500, 1, -1);
});

function update() {
    ctx.clearRect(-200, -200, canvas.width, canvas.height);
    for(const { player } of Object.values(Multyx.clients)) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.position.x - player.size/2, player.position.y - player.size/2, player.size, player.size);
    }
    requestAnimationFrame(update);
}