const DeathScreen = document.getElementById('multyx-9887b6ed-ced2-496a-83b9-1c7b5ec37ac5');
const Respawn = document.getElementById('multyx-d6d28d8f-6abc-48cd-9c38-edcb07380018');
// Update Respawn
_displayLifecycle.registerUpdate('9887b6ed-ced2-496a-83b9-1c7b5ec37ac5', () => {
	// Respawn.update
	// Add your update logic here
	
	
});
Respawn.addEventListener('click', (event) => {
	// Rejoin game with same name
	multyx.send("joinGame", multyx.self.name.value);
});
const Death = document.getElementById('multyx-7a7645ce-57c2-45bf-975c-98ea944c6d90');
const Container = document.getElementById('multyx-de671d4a-b743-4dc3-a408-45c4aa215694');