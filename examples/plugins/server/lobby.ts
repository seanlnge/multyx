import Multyx from 'multyx';
import MultyxPlugin from '../plugin';
import TurnBasedGame from './turnbased';

type ValueOf<T> = T[keyof T];
interface WaitingRoomOptions {
    autoReady?: boolean;
    readyTimer?: number;
}

const DEFAULT_OPTIONS: WaitingRoomOptions = {
    autoReady: false,
    readyTimer: 5000,
}

interface WaitingRoomEventContext {
    client: Multyx.Client;
    clients: Multyx.Client[];
}

export class WaitingRoom extends MultyxPlugin {
    events: Map<any, ((args: WaitingRoomEventContext) => void)[]>;
    private queuedFunctions: ((args: WaitingRoomEventContext) => void)[] = [];
    options: WaitingRoomOptions;

    constructor(server: Multyx.MultyxServer, name: string, options: WaitingRoomOptions = {}) {
        super(server, name);
        this.self.disable();
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    addClient(client: Multyx.Client) {
        super.addClient(client);
        client.self.ready = false;

        client.self.onWrite('ready', ready => {
            if(typeof ready !== 'boolean') return;

            if(!ready) {
                this.emit(WaitingRoom.Events.ClientUnready, { client, clients: this.team.clients });

                return;
            }

            this.emit(WaitingRoom.Events.ClientReady, { client, clients: this.team.clients });
            if(this.team.clients.every(c => c.self.ready)) {
                if(this.options.readyTimer) {
                    this.self.countdown = !!this.options.readyTimer;
                    this.self.countdownStart = Date.now();
                    this.self.countdownEnd = this.self.countdownStart + this.options.readyTimer;
                }

                this.emit(WaitingRoom.Events.AllReady, { client, clients: this.team.clients });
            }
        });

        this.emit(WaitingRoom.Events.ClientJoin, { client, clients: this.team.clients });
    }

    removeClient(client: Multyx.Client) {
        super.removeClient(client);
        this.emit(WaitingRoom.Events.ClientLeave, { client, clients: this.team.clients });

        if(this.team.clients.every(c => c.self.ready)) {
            if(this.options.readyTimer) {
                this.self.countdown = !!this.options.readyTimer;
                this.self.countdownStart = Date.now();
                this.self.countdownEnd = this.self.countdownStart + this.options.readyTimer;
            }

            this.emit(WaitingRoom.Events.AllReady, { client, clients: this.team.clients });
        }
    }

    on<T extends ValueOf<typeof WaitingRoom.Events>>(event: T, callback: (args: WaitingRoomEventContext) => void): void {
        if(!this.events) this.events = new Map();
        if(!this.events.has(event)) this.events.set(event, []);
        this.events.get(event)!.push(callback);
    }

    async emit(event: ValueOf<typeof WaitingRoom.Events>, args: WaitingRoomEventContext) {
        // Execute all event callbacks
        if(this.events.has(event)) {
            for(const callback of this.events.get(event)!) {
                await Promise.all([callback(args)]);

                // Use queued functions to avoid stack overflow
                await Promise.all(this.queuedFunctions.map(fn => fn.bind(this)(args)));
                this.queuedFunctions.length = 0;
            }
        }
    }

    static Events = {
        ClientJoin: 'client-join',
        ClientLeave: 'client-leave',
        ClientReady: 'client-ready',
        ClientUnready: 'client-unready',
        AllReady: 'all-ready',
        AllUnready: 'all-unready',
    } as const;
}

export default WaitingRoom;
