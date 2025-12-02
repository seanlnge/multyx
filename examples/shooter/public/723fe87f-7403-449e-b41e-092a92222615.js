const JoinScreen = document.getElementById('multyx-723fe87f-7403-449e-b41e-092a92222615');
const TitleBox = document.getElementById('multyx-2f0dcbb3-50f2-4d71-bc98-688a2ed478ec');
const Title = document.getElementById('multyx-92be772e-2ad1-4815-86a2-370518a14948');
const Enter = document.getElementById('multyx-29492746-7b3d-4456-b1ad-dd8c3cf48f97');
Enter.addEventListener('click', (event) => {
	multyx.send("joinGame", Name.value);
});
const Name = document.getElementById('multyx-c443f6ca-7ec5-4e54-8e2d-535ab2ee2dad');