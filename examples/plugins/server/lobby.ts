import Multyx from 'multyx';

export class Lobby {
    team: Multyx.MultyxTeam;
    self: Multyx.MultyxObject;

    constructor(teamName: string) {
        this.team = new Multyx.MultyxTeam(teamName);
        this.self = this.team.self;
        this.self.disable();
    }

    addClient = (client: Multyx.Client) => this.team.addClient(client);
    removeClient = (client: Multyx.Client) => this.team.removeClient(client);
    get clients() { return this.team.clients; }
}

export default Lobby;
