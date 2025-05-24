import Multyx from 'multyx';
import TurnBasedGame from '../plugins/server/turnbased';

// Simple card/deck helpers
const suits = ['♠', '♥', '♦', '♣'];
const numbers = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
function createDeck(): any[] {
    const deck: any[] = [];
    for (const suit of suits) for (const number of numbers) deck.push({ suit, number });
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
        if (card.number == 'A') { aces++; value += 11; }
        else if (card.number == "J" || card.number == "Q" || card.number == "K") value += 10;
        else value += parseInt(card.number);
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

    blackjack.addClient(client);
    if(!blackjack.inProgress && blackjack.team.clients.length >= (blackjack.options.minPlayers || 1)) {
        blackjack.startGame();
    }
    return true;
});

// Disable betting when the game starts + give cards
blackjack.on(TurnBasedGame.Events.GameStart, async ({ clients }) => {
    blackjack.self.deck = createDeck();
    blackjack.self.deck.unrelay();
    shuffle(blackjack.self.deck);

    blackjack.self.cards = [blackjack.self.deck.pop(), blackjack.self.deck.pop()];
    blackjack.self.cards[1].unrelay();
    blackjack.self.cardsValue = handValue([blackjack.self.cards[0]]);

    clients.forEach(client => {
        client.self.cards = [blackjack.self.deck.pop(), blackjack.self.deck.pop()];
        client.self.cardsValue = handValue(client.self.cards);
        client.self.cards.disable();
        client.self.cardsValue.disable();
        if(!client.self.bet) client.self.bet = 10;
        client.self.bet.disable();
        client.self.cards.addPublic(blackjack.team);
        client.self.cardsValue.addPublic(blackjack.team);
        client.self.bet.addPublic(blackjack.team);
    });
});

blackjack.on(TurnBasedGame.Events.TurnStart, async ({ client, nextTurn, repeatTurn }) => {
    console.log("next turn " + client.uuid);
    const data = await client.self.await("action");
    delete client.self.action;

    if(data == 'hit') {
        client.self.cards.push(blackjack.self.deck.pop());
        client.self.cardsValue = handValue(client.self.cards);
        return repeatTurn();
    } else if(data == 'double') {
        client.self.bet *= 2;
        client.self.cards.push(blackjack.self.deck.pop());
        client.self.cardsValue = handValue(client.self.cards);
    }

    return nextTurn();
});

// Enable betting after the game ends
blackjack.on(TurnBasedGame.Events.GameEnd, async ({ clients }) => {
    blackjack.self.cards[1].relay();
    blackjack.self.cardsValue = handValue(blackjack.self.cards);

    while(blackjack.self.cardsValue < 17) {
        blackjack.self.cards.push(blackjack.self.deck.pop());
        await new Promise(resolve => setTimeout(resolve, 1000));
        blackjack.self.cardsValue = handValue(blackjack.self.cards);
    }

    clients.forEach(client => {
        if(client.self.cardsValue > 21) {
            client.self.result = 'lose';
        } else if(client.self.cardsValue > blackjack.self.cardsValue || blackjack.self.cardsValue > 21) {
            client.self.result = 'win';
        } else if(client.self.cardsValue == blackjack.self.cardsValue) {
            client.self.result = 'push';
        } else {
            client.self.result = 'lose';
        }
        client.self.bet.enable();
    });
});