const multyx = new Multyx({ logUpdateFrame: false, verbose: true });

multyx.loop(() => {
    document.querySelector('#gameArea').style.display = 'block';

    // Funds and bet UI logic
    const fundsDisplay = document.getElementById('fundsDisplay');
    const betInput = document.getElementById('betInput');
    const betBtn = document.getElementById('betBtn');
    if (fundsDisplay) fundsDisplay.textContent = `Funds: $${multyx.self.funds ?? 0}`;
    if (betInput && betBtn) {
        betInput.disabled = multyx.self.bet && !multyx.self.bet?.editable;
        betBtn.disabled = multyx.self.bet && !multyx.self.bet?.editable;
    }

    const dealer = multyx.teams.players;
    if (!dealer) return;

    let html = '';
    html += `<h2>Dealer</h2><div class='hand'>`;
    html += dealer.cards?.value.map(card => `${card.number}${card.suit}`).join(' ');
    html += '</div>';
    html += '<h2>Players</h2>';
    for (const uuid of dealer.clients) {
        const client = multyx.clients[uuid];
        const hand = client?.cards;
        const handValue = client?.cardsValue;
        if (!hand) continue;
        const name = client?.name || uuid;
        html += `<div class='hand${uuid == multyx.uuid ? ' me' : ''}'>`;
        html += `<b>${name}</b>: `;
        html += hand?.value.map(card => `${card.number}${card.suit}`).join(' ');
        html += ` (${handValue})`;
        if (client.result) {
            html += ` <span class='result'>${client.result}</span>`;
        }
        if (dealer.currentTurn == uuid) {
            html += ' <span class="turn">&larr; Your turn</span>';
        }
        html += '</div>';
    }
    if (!dealer.inProgress) {
        html += '<div class="end">Game over! New game soon...</div>';
    }
    document.querySelector('#gameArea').innerHTML = html;
    document.querySelector('#hitBtn').disabled = dealer.currentTurn != multyx.uuid;
    document.querySelector('#standBtn').disabled = dealer.currentTurn != multyx.uuid;
});

// Bet button logic
const betBtn = document.getElementById('betBtn');
if (betBtn) {
    betBtn.onclick = () => {
        const betInput = document.getElementById('betInput');
        if (betInput) {
            const value = parseInt(betInput.value, 10);
            if (!isNaN(value) && value > 0) {
                multyx.self.bet = value;
            }
        }
    };
}

// Initial UI setup
if (document.querySelector('#gameArea')) document.querySelector('#gameArea').style.display = 'none';
