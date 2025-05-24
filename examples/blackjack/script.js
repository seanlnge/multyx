const multyx = new Multyx({ logUpdateFrame: false, verbose: true });

multyx.loop(() => {
    const dealer = multyx.teams.players;
    if (!dealer) return;
    document.querySelector('#gameArea').style.display = 'block';

    let html = '';
    html += `<h2>Dealer</h2><div class='hand'>`;
    html += dealer.cards.value.map(card => `${card.number}${card.suit}`).join(' ');
    html += '</div>';
    html += '<h2>Players</h2>';
    for (const uuid of dealer.clients) {
        const client = multyx.clients[uuid];
        const hand = client.cards;
        const handValue = client.cardsValue;
        if (!hand) continue;
        const name = client?.name || uuid;
        html += `<div class='hand${uuid == multyx.uuid ? ' me' : ''}'>`;
        html += `<b>${name}</b>: `;
        html += hand.value.map(card => `${card.number}${card.suit}`).join(' ');
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

// Initial UI setup
if (document.querySelector('#gameArea')) document.querySelector('#gameArea').style.display = 'none';
