const multyx = new Multyx();

const messageBox = document.querySelector('.messageBox');
const messageEntry = document.querySelector('.messageEntry');

function sendMessage() {
    multyx.all.messages.push(messageEntry.value);
    messageEntry.value = "";
}

function buildPage() {
    messageBox.innerHTML = '';
    for(const message of multyx.all.messages) {
        const m = document.createElement('p');
        m.innerText = message;
        messageBox.appendChild(m);
    }
    messageBox.scrollTo({ top: messageBox.scrollHeight });
}

multyx.on(Multyx.Start, buildPage);
multyx.on(Multyx.Edit, buildPage);