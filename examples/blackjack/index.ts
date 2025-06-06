import Multyx from 'multyx';
import TurnBasedGame from '../plugins/server/turnbased';
import { WaitingRoom } from '../plugins/server/lobby';
import { GameStateManager } from '../plugins/server/manager';

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

const multyx = new Multyx.MultyxServer(() => console.log('Blackjack server started'));

const waitingRoom = new WaitingRoom(multyx, 'lobby');
const blackjack = new TurnBasedGame(multyx, 'players', {
    minPlayers: 2,
    maxPlayers: 10,
    turnOrder: TurnBasedGame.TurnOrder.Sequential,
    turnCount: TurnBasedGame.TurnCount.PlayerCount,
    secondsTimeout: 8
});
const manager = new GameStateManager(multyx, 'manager', waitingRoom);

blackjack.self.deck = createDeck(); // Create a new deck if the old one is out of cards
shuffle(blackjack.self.deck);
blackjack.self.deck.unrelay(); // Hide the deck from the clients

multyx.on(Multyx.Events.Connect, (client) => {
    waitingRoom.addClient(client);
});

waitingRoom.on(WaitingRoom.Events.ClientJoin, ({ client }) => {
    client.self.funds = 1000;

    // Ensure the bet can only be a positive integer
    client.self.bet = 1;
    client.self.bet.int().min(1);
});

waitingRoom.on(WaitingRoom.Events.AllReady, () => {
    manager.move({ from: waitingRoom, to: blackjack });
});

// Disable betting when the game starts + give cards
blackjack.on(TurnBasedGame.Events.GameStart, async ({ clients }) => {
    // Shuffle deck if low on cards
    if(blackjack.self.deck.length < 26) shuffle(blackjack.self.deck);

    // Deal cards to the dealer
    blackjack.self.cards = [blackjack.self.deck.pop(), blackjack.self.deck.pop()]; // Deal two cards to the dealer
    blackjack.self.cards[1].unrelay(); // Hide the second card from the clients
    blackjack.self.cardsValue = handValue([blackjack.self.cards[0]]); // Calculate the value of the first card

    // Deal cards to the clients
    for(const client of clients) {
        client.self.funds -= client.self.bet;
        client.self.cards = [blackjack.self.deck.pop(), blackjack.self.deck.pop()]; // Deal two cards to the client
        client.self.cardsValue = handValue(client.self.cards); // Calculate the value of the cards
        client.self.cards.disable(); // Disable the cards from being changed
        client.self.cardsValue.disable(); // Disable the value from being changed
        client.self.bet.disable(); // Disable the bet from being changed
        client.self.cards.addPublic(blackjack.team); // Let all clients on team see the cards
        client.self.cardsValue.addPublic(blackjack.team); // Let all clients on team see the value
        client.self.bet.addPublic(blackjack.team); // Let all clients on team see the bet
    }
});

// Handle the client's turn
blackjack.on(TurnBasedGame.Events.TurnStart, async ({ client, nextTurn, repeatTurn }) => {
    const data = await client.self.await("action"); // Wait for the client to send an action

    delete client.self.action; // Delete the action from the client
    
    if(data == 'hit' || data == 'double') {
        client.self.cards.push(blackjack.self.deck.pop()); // Deal a card to the client
        client.self.cardsValue = handValue(client.self.cards); // Calculate the value of the cards
        
        if(client.self.cardsValue > 21) { // If the client has busted
            client.self.result = 'lose'; // Set the result to lose
            return nextTurn(); // Move to the next turn
        }
    }

    if(data == 'double') {
        client.self.funds -= client.self.bet;
        client.self.bet *= 2;
    }

    if(data == 'hit') return repeatTurn(); // If the client hits, repeat the turn
    return nextTurn(); // Move to the next turn
});

// Enable betting after the game ends
blackjack.on(TurnBasedGame.Events.GameEnd, async ({ clients }) => {
    blackjack.self.cards[1].relay(); // Reveal the second card to the clients
    blackjack.self.cardsValue = handValue(blackjack.self.cards); // Calculate the value of the cards

    while(blackjack.self.cardsValue < 17) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second per card
        blackjack.self.cards.push(blackjack.self.deck.pop()); // Deal a card to the dealer
        blackjack.self.cardsValue = handValue(blackjack.self.cards); // Calculate the value of the cards
    }

    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second to reveal results
    clients.forEach(client => {
        if(client.self.cardsValue <= 21 && (client.self.cardsValue > blackjack.self.cardsValue || blackjack.self.cardsValue > 21)) {
            client.self.result = 'win';
            client.self.funds += 2 * client.self.bet;
        } else if(client.self.cardsValue <= 21 && (client.self.cardsValue == blackjack.self.cardsValue)) {
            client.self.result = 'push';
            client.self.funds += client.self.bet;
        } else {
            client.self.result = 'lose';
        }
    });

    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before moving to next game
    clients.forEach(client => {
        // Reset client state
        delete client.self.result;
        delete client.self.cards;
        delete client.self.cardsValue;
        client.self.bet.enable();
    });

    manager.move({ from: blackjack, to: waitingRoom });
});