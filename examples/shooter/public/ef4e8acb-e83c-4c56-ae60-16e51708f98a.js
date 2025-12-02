const GameScreen = document.getElementById('multyx-ef4e8acb-e83c-4c56-ae60-16e51708f98a');
const Gc = document.getElementById('multyx-3230a310-ff3f-448f-a416-9164e780ad26');
const GcCtx = Gc.getContext('2d');
// Initialize Gc
_displayLifecycle.registerInitializer('ef4e8acb-e83c-4c56-ae60-16e51708f98a', () => {
	// gc.initialize
	// Add your initialize logic here
	
	multyx.controller.mapCanvasPosition(Gc, { top: 600, anchor: "bottomleft" });
	multyx.controller.mapMouseToCanvas(Gc);
});
// Update Gc
_displayLifecycle.registerUpdate('ef4e8acb-e83c-4c56-ae60-16e51708f98a', () => {
	// gc.update
	// Add your update logic here
	
	for(const uuid of multyx.teams.Engine.clients) {
	    const client = multyx.clients[uuid];
	    GcCtx.fillStyle = client.color;
	    GcCtx.fillRect(client.x - 10, client.y - 10, 20, 20);
	}
});