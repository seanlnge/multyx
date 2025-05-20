const multyx = new Multyx({ logUpdateFrame: false, verbose: true });

let myUUID = null;
let gameState = {};

async function joinGame() {
    const name = document.querySelector('.messageEntry').value;
    const valid = await multyx.send('join', name, true);
    if (!valid) {
        document.querySelector('.messageEntry').value = '';
        alert('Name was not valid. Try another one');
        return;
    }
    document.querySelector('.messages').style.display = 'none';
    document.querySelector('#gameArea').style.display = 'block';
    myUUID = multyx.uuid;
}

document.querySelector('#joinBtn').onclick = joinGame;

document.querySelector('#hitBtn').onclick = () => {
    multyx.send('action', 'hit');
};
document.querySelector('#standBtn').onclick = () => {
    multyx.send('action', 'stand');
};

function render() {
    const area = document.querySelector('#gameArea');
    if (!gameState || !gameState.players) return;
    let html = '';
    html += `<h2>Dealer</h2><div class='hand'>`;
    if (gameState.finished) {
        html += gameState.state.dealer.map(card => `${card.value}${card.suit}`).join(' ');
    } else {
        html += `${gameState.state.dealer[0].value}${gameState.state.dealer[0].suit} ??`;
    }
    html += '</div>';
    html += '<h2>Players</h2>';
    for (const uuid of gameState.players) {
        const hand = gameState.state.hands[uuid];
        if (!hand) continue;
        const name = multyx.clients[uuid]?.name || uuid;
        html += `<div class='hand${uuid === myUUID ? ' me' : ''}'>`;
        html += `<b>${name}</b>: `;
        html += hand.map(card => `${card.value}${card.suit}`).join(' ');
        html += ` (${handValue(hand)})`;
        if (gameState.state.results && gameState.state.results[uuid]) {
            html += ` <span class='result'>${gameState.state.results[uuid]}</span>`;
        }
        if (gameState.currentTurn === uuid && !gameState.finished) {
            html += ' <span class="turn">&larr; Your turn</span>';
        }
        html += '</div>';
    }
    if (gameState.finished) {
        html += '<div class="end">Game over! New game soon...</div>';
    }
    document.querySelector('#gameArea').innerHTML = html + document.querySelector('#controls').outerHTML;
    document.querySelector('#hitBtn').disabled = !(gameState.currentTurn === myUUID && !gameState.finished);
    document.querySelector('#standBtn').disabled = !(gameState.currentTurn === myUUID && !gameState.finished);
}

function handValue(hand) {
    let value = 0, aces = 0;
    for (const card of hand) {
        if (card.value === 'A') { aces++; value += 11; }
        else if (['K', 'Q', 'J'].includes(card.value)) value += 10;
        else value += +card.value;
    }
    while (value > 21 && aces) { value -= 10; aces--; }
    return value;
}

multyx.on('turnbased_state', state => {
    gameState = state;
    render();
});

// Initial UI setup
if (document.querySelector('#gameArea')) document.querySelector('#gameArea').style.display = 'none';
