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

type ValueOf<T> = T[keyof T];

interface TurnBasedGameStartArgs {
    clients: Multyx.Client[];
    endGame: () => void;
}

interface TurnBasedTurnStartArgs {
    client: Multyx.Client;
    clients: Multyx.Client[];
    nextTurn: () => void;
    repeatTurn: () => void;
    endGame: () => void;
    turnStart: number;
    secondsRemaining: number;
}

interface TurnBasedTimeoutArgs {
    client: Multyx.Client;
    clients: Multyx.Client[];
    nextTurn: () => void;
    repeatTurn: () => void;
    endGame: () => void;
    turnStart: number;
}

interface TurnBasedGameEndArgs {
    clients: Multyx.Client[];
}

type TurnBasedEventArguments<T extends ValueOf<typeof TurnBasedGame.Events>> = 
    T extends typeof TurnBasedGame.Events.TurnStart ? TurnBasedTurnStartArgs :
    T extends typeof TurnBasedGame.Events.Timeout ? TurnBasedTimeoutArgs :
    T extends typeof TurnBasedGame.Events.GameStart ? TurnBasedGameStartArgs :
    T extends typeof TurnBasedGame.Events.GameEnd ? TurnBasedGameEndArgs :
    never;

export class TurnBasedGame {
    team: Multyx.MultyxTeam;
    order: number[];
    inProgress: boolean;
    options: TurnBasedOptions;
    self: Multyx.MultyxObject;
    events: Map<any, ((args: TurnBasedEventArguments<any>) => void)[]>;

    constructor(teamName: string, options: TurnBasedOptions = {}) {
        this.team = new Multyx.MultyxTeam(teamName);
        this.self = this.team.self;
        this.self.disable();

        this.inProgress = false;
        this.options = this.self.options = { ...DEFAULT_OPTIONS, ...options };
        if(this.self.options.relayOrder) this.order =this.self.order = [];
        else this.order = this.self.order;
    }
    
    addClient = (client: Multyx.Client) => this.team.addClient(client);
    removeClient = (client: Multyx.Client) => this.team.removeClient(client);

    on<T extends ValueOf<typeof TurnBasedGame.Events>>(event: T, callback: (args: TurnBasedEventArguments<T>) => void): void {
        if(!this.events) this.events = new Map();
        if(!this.events.has(event)) this.events.set(event, []);
        this.events.get(event)!.push(callback as (args: TurnBasedEventArguments<any>) => void);
    }

    emit(event: ValueOf<typeof TurnBasedGame.Events>) {
        this.events.get(event)?.forEach(callback => callback({
            client: this.team.clients.find(c => c.uuid === this.self.currentTurn)!,
            nextTurn: () => this.nextTurn(),
            repeatTurn: () => this.repeatTurn(),
            endGame: () => this.endGame(),
            turnStart: this.self.turnStart,
            secondsRemaining: this.self.options.secondsTimeout - (Date.now() - this.self.turnStart) / 1000
        } as TurnBasedEventArguments<typeof event>));
    }

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
        
        if(this.options.relayOrder) {
            this.self.order = this.order; // stores order and sends to clients
            this.order = this.self.order; // stores reference to multyxobject
        }

        this.emit(TurnBasedGame.Events.GameStart);
        this.nextTurn();
    }

    endGame() {
        this.inProgress = false;
        this.emit(TurnBasedGame.Events.GameEnd);
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

    static Events = {
        TurnStart: 'turn-start' as 'turn-start',
        Timeout: 'timeout' as 'timeout',
        GameStart: 'game-start' as 'game-start',
        GameEnd: 'game-end' as 'game-end'
    };

    static TurnOrder = {
        Sequential: 'sequential' as 'sequential',
        Random: 'random' as 'random',
        RandomRepeat: 'random-repeat' as 'random-repeat'
    };

    static TurnCount = {
        PlayerCount: 'player-count' as 'player-count',
        Fixed: 'fixed' as 'fixed'
    };
}

export default TurnBasedGame;
