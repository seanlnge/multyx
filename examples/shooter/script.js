function joinGame() {
    Multyx.send("join", document.querySelector(".messageEntry").value);
    document.querySelector("#gameCanvas").style.display = "block";
}

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

Multyx.controller.mapCanvasPosition(canvas, { right: 1000, anchor: 'bottomleft' });
Multyx.controller.mapMouseToCanvas(canvas);

Multyx.loop(60, () => {
    if(!Multyx.teams.players) return;

    ctx.clearRect(0, 0, 1000, 1000);
    for(const client of Object.values(Multyx.teams.players)) {
        console.log(client);
    }
});