import Multyx from 'multyx';

export default class MultyxPlugin {
    team: Multyx.MultyxTeam;
    self: Multyx.MultyxObject;

    constructor(public server: Multyx.MultyxServer, public name: string) {
        this.team = new Multyx.MultyxTeam(name);
        this.self = this.team.self;
        this.self.disable()
    }

    addClient(client: Multyx.Client) {
        this.team.addClient(client);
    }

    removeClient(client: Multyx.Client) {
        this.team.removeClient(client);
    }

    get clients() {
        return this.team.clients;
    }
}