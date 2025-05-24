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
    turnOrder: TurnBasedGame.TurnOrder.Sequential,
    turnCount: TurnBasedGame.TurnCount.PlayerCount,
    secondsTimeout: 8
});

multyx.on(Multyx.Events.Connect, (client) => {
    if(blackjack.team.clients.includes(client)) return false;
    client.self.disable();

    blackjack.addClient(client);
    if(!blackjack.inProgress && blackjack.team.clients.length >= (blackjack.options.minPlayers || 1)) {
        blackjack.startGame();
    }
    return true;
});

blackjack.self.deck = createDeck();
blackjack.self.deck.unrelay();

// Disable betting when the game starts + give cards
blackjack.on(TurnBasedGame.Events.GameStart, async ({ clients }) => {
    blackjack.self.deck.shuffle();
    clients.forEach(client => {
        client.self.cards = [blackjack.self.deck.pop(), blackjack.self.deck.pop()];
        client.self.cardsValue = handValue(client.self.cards);
        client.self.bet.disable();
    });
});

blackjack.on(TurnBasedGame.Events.TurnStart, async ({ client, nextTurn, repeatTurn }) => {
    const data = await client.await('action');

    if(data == 'hit') {
        client.self.cards.push(blackjack.self.deck.pop());
        client.self.cardsValue = handValue(client.self.cards);
        repeatTurn();
    } else if(data == 'double') {
        client.self.bet *= 2;
        client.self.cards.push(blackjack.self.deck.pop());
        client.self.cardsValue = handValue(client.self.cards);
    }

    nextTurn();
});

// Enable betting after the game ends
blackjack.on(TurnBasedGame.Events.GameEnd, async ({ clients }) => {
    clients.forEach(client => {
        client.self.bet.enable();
    });
});