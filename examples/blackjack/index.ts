import Multyx from 'multyx';
import TurnBasedGame from '../plugins/server/turnbased';

// Simple card/deck helpers
const suits = ['♠', '♥', '♦', '♣'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
function createDeck(): any[] {
    const deck: any[] = [];
    for (const suit of suits) for (const value of values) deck.push({ suit, value });
    return deck;
}
function shuffle(deck: any[]) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}
function handValue(hand: any[]) {
    let value = 0, aces = 0;
    for (const card of hand) {
        if (card.value === 'A') { aces++; value += 11; }
        else if (['K', 'Q', 'J'].includes(card.value)) value += 10;
        else value += +card.value;
    }
    while (value > 21 && aces) { value -= 10; aces--; }
    return value;
}

const multyx = new Multyx.MultyxServer({ tps: 4 }, () => console.log('Blackjack server started'));

const blackjack = new TurnBasedGame('players', {
    minPlayers: 1,
    maxPlayers: 4,
    turnOrder: 'sequential',
    turnCount: 'player-count',
    secondsTimeout: 8
});

blackjack.self.deck = createDeck();
blackjack.self.deck.unrelay();

blackjack.on(TurnBasedGame.Events.GameStart, async ({ client, nextTurn, repeatTurn }) => {
    client.self.cards = [blackjack.self.deck.pop(), blackjack.self.deck.pop()];
    client.self.cardsValue = handValue(client.self.cards);
    client.self.bet = 1;
});

blackjack.on(TurnBasedGame.Events.TurnStart, async ({ client, nextTurn, repeatTurn }) => {
    const data = await client.send('turn', {}, true);

    if(data == 'hit') {
        client.self.cards.push(blackjack.self.deck.pop());
        client.self.cardsValue = handValue(client.self.cards);
        repeatTurn();
    } else if(data == 'stand') {
        nextTurn();
    } else if(data == 'double') {
        client.self.bet *= 2;
        client.self.cards.push(blackjack.self.deck.pop());
        client.self.cardsValue = handValue(client.self.cards);
        nextTurn();
    }
});

multyx.on('join', (client, name) => {
    if (blackjack.players.includes(client)) return false;
    client.self.name = name;
    blackjack.addPlayer(client);
    if (!blackjack.inProgress && blackjack.players.length >= (blackjack.options.minPlayers || 1)) {
        blackjack.startGame();
    }
    return true;
});

multyx.on('action', (client, action) => {
    blackjack.handleAction(client, action);
});
