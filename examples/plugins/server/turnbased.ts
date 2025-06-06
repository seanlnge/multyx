import Multyx from 'multyx';
import MultyxPlugin from '../plugin';
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
    startGame: () => void;
}

type TurnBasedEventContext<T extends ValueOf<typeof TurnBasedGame.Events>> = 
    T extends typeof TurnBasedGame.Events.TurnStart ? TurnBasedTurnStartArgs :
    T extends typeof TurnBasedGame.Events.Timeout ? TurnBasedTimeoutArgs :
    T extends typeof TurnBasedGame.Events.GameStart ? TurnBasedGameStartArgs :
    T extends typeof TurnBasedGame.Events.GameEnd ? TurnBasedGameEndArgs :
    never;

export class TurnBasedGame extends MultyxPlugin {
    order: number[];
    inProgress: boolean;
    options: TurnBasedOptions;
    events: Map<any, ((args: TurnBasedEventContext<any>) => void)[]>;
    private queuedFunctions: ((args: TurnBasedEventContext<any>) => void)[] = [];

    constructor(server: Multyx.MultyxServer, name: string, options: TurnBasedOptions = {}) {
        super(server, name);

        this.self.inProgress = false;
        this.options = this.self.options = { ...DEFAULT_OPTIONS, ...options };
        this.order = [];
    }
    
    on<T extends ValueOf<typeof TurnBasedGame.Events>>(event: T, callback: (args: TurnBasedEventContext<T>) => void): void {
        if(!this.events) this.events = new Map();
        if(!this.events.has(event)) this.events.set(event, []);
        this.events.get(event)!.push(callback as (args: TurnBasedEventContext<any>) => void);
    }

    async emit(event: ValueOf<typeof TurnBasedGame.Events>, after?: () => any) {
        const args = {
            client: this.team.clients.find(c => c.uuid == this.self.currentTurn)!,
            clients: this.team.clients,
            nextTurn: () => this.queuedFunctions.push(this.nextTurn),
            repeatTurn: () => this.queuedFunctions.push(this.repeatTurn),
            endGame: () => this.queuedFunctions.push(this.endGame),
            startGame: () => this.queuedFunctions.push(this.startGame),
            turnStart: this.self.turnStart,
            secondsRemaining: this.self.options.secondsTimeout - (Date.now() - this.self.turnStart) / 1000
        } as TurnBasedEventContext<typeof event>;

        // Execute all event callbacks
        if(this.events.has(event)) {
            for(const callback of this.events.get(event)!) {
                await Promise.all([callback(args)]);

                // Use queued functions to avoid stack overflow
                await Promise.all(this.queuedFunctions.map(fn => fn.bind(this)(args)));
                this.queuedFunctions.length = 0;
                after?.bind(this)();
            }
        }
    }

    startGame() {
        this.self.inProgress = true;
        const turnCount = this.options.turnCount == 'player-count' ? this.team.clients.length : (this.options.turnCount ?? 0);

        if(this.options.turnOrder == 'sequential') {
            this.order = Array(turnCount).fill(0).map((_, i) => i % this.team.clients.length);
        } else if(this.options.turnOrder == 'random') {
            this.order = Array(turnCount).fill(0).map((_, i) => i % this.team.clients.length).sort(() => Math.random() - 0.5);
        } else if(this.options.turnOrder == 'random-repeat') {
            this.order = Array(turnCount).fill(0).map(() => Math.floor(Math.random() * this.team.clients.length));
        }

        this.emit(TurnBasedGame.Events.GameStart, this.nextTurn);
    }

    endGame() {
        this.self.inProgress = false;
        this.self.currentTurn = undefined;
        this.emit(TurnBasedGame.Events.GameEnd);
    }

    private repeatTurn() {
        this.self.turnStart = Date.now();
        this.emit(TurnBasedGame.Events.TurnStart);
    }

    private nextTurn() {
        const index = this.order.pop();
        if(index == undefined) return this.endGame();
        const client = this.team.clients[index];
        if(!client) return this.endGame();
        this.self.currentTurn = client.uuid;
        this.self.turnStart = Date.now();
        this.emit(TurnBasedGame.Events.TurnStart);
    }

    static Events = {
        TurnStart: 'turn-start',
        Timeout: 'timeout',
        GameStart: 'game-start',
        GameEnd: 'game-end'
    } as const;

    static TurnOrder = {
        Sequential: 'sequential',
        Random: 'random',
        RandomRepeat: 'random-repeat'
    } as const;

    static TurnCount = {
        PlayerCount: 'player-count',
        Fixed: 'fixed'
    } as const;
}

export default TurnBasedGame;
