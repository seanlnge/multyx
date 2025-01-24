const multyx = new Multyx();

// Function called when join game button pressed
async function joinGame() {
    const valid = await multyx.send("join", document.querySelector(".messageEntry").value, true);

    if(!valid) {
        document.querySelector(".messageEntry").value = "";
        alert("Name was not valid. Try another one");
        return;
    }

    // Show the canvas and hide the name entry box
    document.querySelector(".messages").style.display = "none";
    document.querySelector("#gameCanvas").style.display = "block";

    multyx.controller.mapCanvasPosition(canvas, { top: 1000, anchor: 'center' });
    multyx.controller.mapMouseToCanvas(canvas);

    ctx.fillStyle = "white";
    ctx.fillRect(-1000, -1000, 2000, 2000);

    // Lerp all clients to ever join the players team
    multyx.teams.players.clients.forAll(clientUUID => {
        multyx.clients[clientUUID].x.Lerp();
        multyx.clients[clientUUID].y.Lerp();
    });
    multyx.teams.players.bullets.forAll(bullet => {
        bullet.x.PredictiveLerp();
        bullet.y.PredictiveLerp();
    });
}

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

multyx.loop(() => {
    if(!multyx.teams.players) return;

    ctx.clearRect(-1000, -1000, 2000, 2000);
    ctx.fillStyle = "white";
    ctx.fillRect(-1000, -1000, 2000, 2000);

    ctx.fillStyle = "black";
    for(const uuid of multyx.teams.players.clients) {
        const client = multyx.clients[uuid];
        ctx.fillRect(client.x-20, client.y-20, 40, 40);
    }
    for(const bullet of multyx.teams.players.bullets) {
        ctx.beginPath();
        ctx.ellipse(bullet.x, bullet.y, 5, 5, 0, 0, Math.PI*2);
        ctx.closePath();
        ctx.fill();
    }
}, 60);