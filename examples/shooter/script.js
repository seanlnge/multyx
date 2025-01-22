// Function called when join game button pressed
async function joinGame() {
    const valid = await Multyx.send("join", document.querySelector(".messageEntry").value, true);

    if(!valid) {
        document.querySelector(".messageEntry").value = "";
        alert("Name was not valid. Try another one");
        return;
    }

    // Show the canvas and hide the name entry box
    document.querySelector(".messages").style.display = "none";
    document.querySelector("#gameCanvas").style.display = "block";

    Multyx.controller.mapCanvasPosition(canvas, { top: 1000, anchor: 'center' });
    Multyx.controller.mapMouseToCanvas(canvas);

    ctx.fillStyle = "white";
    ctx.fillRect(-1000, -1000, 2000, 2000);

    // Lerp all clients to ever join the players team
    Multyx.teams.players.clients.forAll(clientUUID => {
        Multyx.clients[clientUUID].x.Lerp();
        Multyx.clients[clientUUID].y.Lerp();
    });
    Multyx.teams.players.bullets.forAll(bullet => {
        bullet.x.PredictiveLerp();
        bullet.y.PredictiveLerp();
    });
}

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

Multyx.loop(60, () => {
    if(!Multyx.teams.players) return;

    ctx.clearRect(-1000, -1000, 2000, 2000);
    ctx.fillStyle = "white";
    ctx.fillRect(-1000, -1000, 2000, 2000);

    ctx.fillStyle = "black";
    for(const uuid of Multyx.teams.players.clients) {
        const client = Multyx.clients[uuid];
        ctx.fillRect(client.x-20, client.y-20, 40, 40);
    }
    for(const bullet of Multyx.teams.players.bullets) {
        ctx.beginPath();
        ctx.ellipse(bullet.x, bullet.y, 5, 5, 0, 0, Math.PI*2);
        ctx.closePath();
        ctx.fill();
    }
});