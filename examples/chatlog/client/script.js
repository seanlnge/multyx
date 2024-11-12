const messageBox = document.querySelector('.messageBox');
const messageEntry = document.querySelector('.messageEntry');

function sendMessage() {
    Multyx.all.messages.push(messageEntry.value);
    messageEntry.value = "";
}

function buildPage() {
    messageBox.innerHTML = '';
    for(const message of Multyx.all.messages) {
        const m = document.createElement('p');
        m.innerText = message;
        messageBox.appendChild(m);
    }
    messageBox.scrollTo({ top: messageBox.scrollHeight });
}

Multyx.on(Multyx.Start, buildPage);
Multyx.on(Multyx.Edit, buildPage);