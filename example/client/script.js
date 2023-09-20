const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 2000;
canvas.height = canvas.width * window.innerHeight / window.innerWidth;

const multyx = new Multyx('what');

multyx.on(Multyx.Start, () => {
    console.log(multyx.client);
    window.player = multyx.client.player;
    requestAnimationFrame(update);

    for(const client of Object.values(multyx.clients)) {
        Multyx.Lerp(client.player.position, "x");
        Multyx.Lerp(client.player.position, "y");
    }
});

multyx.on(Multyx.Connection, client => {
    Multyx.Lerp(client.player.position, "x");
    Multyx.Lerp(client.player.position, "y");
});

const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => delete keys[e.code]);

function update() {
    let x = 0;
    let y = 0;
    if(keys['ArrowLeft']) x -= 5;
    if(keys['ArrowRight']) x += 5;
    if(keys['ArrowUp']) y -= 5;
    if(keys['ArrowDown']) y += 5;
    if(x && y) {
        x /= Math.SQRT2;
        y /= Math.SQRT2;
    }
    player.position.x += x;
    player.position.y += y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(const { player } of Object.values(multyx.clients)) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.position.x - 10, player.position.y - 10, 20, 20);
    }
    requestAnimationFrame(update);
}