const JoinScreen = document.getElementById('multyx-d6ce2cb9-82ed-48b5-b2a1-c7979a87d32c');
const TitleBox = document.getElementById('multyx-0c554286-9a97-467a-9da8-669a6ebc7291');
const Title = document.getElementById('multyx-6bc5d775-27f7-4ab6-b2a0-4d5135a6a55d');
const Enter = document.getElementById('multyx-404b0d31-0742-47f6-ab52-53586197ee73');
Enter.addEventListener('click', (event) => {
	// When button pressed, send "joinGame" event to server with player name
	// (will be picked up by the receiver)
	multyx.send("joinGame", Name.value);
});
const Name = document.getElementById('multyx-8657e989-dacd-481d-8253-3d9f26a64c08');