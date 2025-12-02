const GameScreen = document.getElementById('multyx-83652810-9928-4d0c-a737-6ea36b7ae01a');
const Gc = document.getElementById('multyx-7624ebc5-d039-45cf-883a-38f93cda9348');
const GcCtx = Gc.getContext('2d');
// Initialize Gc
_displayLifecycle.registerInitializer('83652810-9928-4d0c-a737-6ea36b7ae01a', () => {
	// Position and scale canvas
	// Set origin to (0, 0) in bottom left
	multyx.controller.mapCanvasPosition(Gc, { top: 600, anchor: "bottomleft" });
	
	// Make mouse position relative to canvas
	multyx.controller.mapMouseToCanvas(Gc);
});
// Update Gc
_displayLifecycle.registerUpdate('83652810-9928-4d0c-a737-6ea36b7ae01a', () => {
	// Clear the screen to prepare for new frame drawing
	GcCtx.clearRect(0, 0, 600, 600);
	
	// Loop over player uuids
	for(const uuid of multyx.teams.Engine.clients) {
	    // Get player and draw onto screen
	    const client = multyx.clients[uuid];
	    GcCtx.fillStyle = client.color;
	    GcCtx.fillRect(client.x - 10, client.y - 10, 20, 20);
	}
	
	GcCtx.fillStyle = "black";
	for(const bullet of multyx.teams.Engine.bullets) {
	    GcCtx.beginPath();
	    GcCtx.ellipse(bullet.x - 5, bullet.y - 5, 5, 5, 0, 0, Math.PI*2);
	    GcCtx.fill();
	    GcCtx.closePath();
	}
});