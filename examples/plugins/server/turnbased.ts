import Multyx from 'multyx';

interface TurnBasedOptions {
    minPlayers?: number;
    maxPlayers?: number;
    turnOrder?: 'sequential' | 'random' | 'random-repeat';
    secondsTimeout?: number;
    turnCount?: number | 'player-count';
    relayOrder?: boolean;
};

const DEFAULT_OPTIONS: TurnBasedOptions = {
    minPlayers: 2,
    maxPlayers: Infinity,
    turnOrder: 'sequential',
    secondsTimeout: 0,
    turnCount: 'player-count',
    relayOrder: false,
};

interface TurnBasedEventArguments {
    client: Multyx.Client;
    nextTurn: () => void;
    repeatTurn: () => void;
    turnStart: number;
    secondsRemaining: number;
}

export class TurnBasedGame {
    team: Multyx.MultyxTeam;
    currentTurnTeam: Multyx.MultyxTeam;
    order: number[];
    inProgress: boolean;
    options: TurnBasedOptions;
    self: Multyx.MultyxObject;
    events: Map<Symbol, ((args: TurnBasedEventArguments) => void)[]>;

    constructor(teamName: string, options: TurnBasedOptions = {}) {
        this.team = new Multyx.MultyxTeam(teamName);
        this.self = this.team.self;
        this.self.disable();

        this.inProgress = false;
        this.options = this.self.options = { ...DEFAULT_OPTIONS, ...options };
        this.order = this.self.options.relayOrder ? (this.self.order = []) : [];
    }

    on(event: Symbol, callback: (args: TurnBasedEventArguments) => void) {
        if(!this.events.has(event)) this.events.set(event, []);
        this.events.get(event)!.push(callback);
    }

    emit(event: Symbol) {
        this.events.get(event)?.forEach(callback => callback({
            client: this.team.clients.find(c => c.uuid === this.self.currentTurn)!,
            nextTurn: () => this.nextTurn(),
            repeatTurn: () => this.repeatTurn(),
            turnStart: this.self.turnStart,
            secondsRemaining: this.self.options.secondsTimeout - (Date.now() - this.self.turnStart) / 1000
        }));
    }

    addClient = (client: Multyx.Client) => this.team.addClient(client);
    removeClient = (client: Multyx.Client) => this.team.removeClient(client);

    startGame() {
        this.inProgress = true;
        const turnCount = this.options.turnCount == 'player-count' ? this.team.clients.length : this.options.turnCount ?? 0;

        if(this.options.turnOrder == 'sequential') {
            this.order = Array(turnCount).fill(0).map((_, i) => i % this.team.clients.length);
        } else if(this.options.turnOrder == 'random') {
            this.order = Array(turnCount).fill(0).map((_, i) => i % this.team.clients.length).sort(() => Math.random() - 0.5);
        } else if(this.options.turnOrder == 'random-repeat') {
            this.order = Array(turnCount).fill(0).map(() => Math.floor(Math.random() * this.team.clients.length));
        }
        
        // Looks like it does nothing, but since this.self is a proxy, it will update the order in the original object
        if(this.options.relayOrder) {
            this.self.order = this.order;
            this.order = this.self.order;
        }

        this.nextTurn();
    }

    endGame() {
        this.inProgress = false;

        const oldClient = this.currentTurnTeam.clients[0];
        if(oldClient) this.currentTurnTeam.removeClient(oldClient);
        this.currentTurnTeam.self.keys().forEach(key => {
            this.currentTurnTeam.self.delete(key);
        });
    }

    repeatTurn() {
        this.self.turnStart = Date.now();
        this.emit(TurnBasedGame.Events.TurnStart);
    }

    nextTurn() {
        const index = this.order.pop();
        if(index == undefined) return this.endGame();
        const client = this.team.clients[index];
        this.self.currentTurn = client.uuid;
        this.self.turnStart = Date.now();
        this.emit(TurnBasedGame.Events.TurnStart);
    }

    startTurn(client: Multyx.Client) {
        this.currentTurnTeam.self.set('client', client.uuid);
        this.currentTurnTeam.addClient(client);
    }

    endTurn(client: Multyx.Client) {
        this.currentTurnTeam.removeClient(client);
        this.currentTurnTeam.self.keys().forEach(key => {
            this.currentTurnTeam.self.delete(key);
        });
    }

    static Events = {
        TurnStart: Symbol('turn-start'),
        Timeout: Symbol('timeout'),
        GameStart: Symbol('game-start'),
        GameEnd: Symbol('game-end')
    }
}

export default TurnBasedGame;
