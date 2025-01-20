async function joinGame() {
    const valid = await Multyx.send("join", document.querySelector(".messageEntry").value, true);

    if(!valid) {
        document.querySelector(".messageEntry").value = "";
        alert("Name was not valid. Try another one");
        return;
    }

    document.querySelector(".messages").style.display = "none";
    document.querySelector("#gameCanvas").style.display = "block";

    ctx.fillStyle = "white";
    ctx.fillRect(-1000, -1000, 2000, 2000);
}

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

Multyx.controller.mapCanvasPosition(canvas, { top: 1000, right: 1000, anchor: 'center' });
Multyx.controller.mapMouseToCanvas(canvas);

Multyx.loop(60, () => {
    if(!Multyx.teams.players) return;

    ctx.clearRect(-1000, -1000, 2000, 2000);
    ctx.fillStyle = "white";
    ctx.fillRect(-1000, -1000, 2000, 2000);

    for(const uuid of Multyx.teams.players.clients) {
        const client = Multyx.clients[uuid];

        ctx.fillStyle = "black";
        //ctx.fillRect(client.x-20, client.y-20, 40, 40);
    }
});