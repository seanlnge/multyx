const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

Multyx.controller.mapCanvasPosition(canvas, { top: 500, anchor: 'center' });
Multyx.controller.mapMouseToCanvas(canvas);

Multyx.forAll(client => Multyx.Lerp(client.player.position));
Multyx.on(Multyx.Start, () => requestAnimationFrame(update));

function update() {
    ctx.clearRect(-canvas.width, -canvas.height, 2*canvas.width, 2*canvas.height);
    for(const { player } of Object.values(Multyx.clients)) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.position.x - player.size/2, player.position.y - player.size/2, player.size, player.size);
    }
    requestAnimationFrame(update); 
}