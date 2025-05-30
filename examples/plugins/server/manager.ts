import Multyx from "multyx";
import MultyxPlugin from "../plugin";

export class GameStateManager extends MultyxPlugin {
    constructor(server: Multyx.MultyxServer, name: string, public initialSpace: MultyxPlugin) {
        super(server, name);
    }

    addClient(client: Multyx.Client) {
        super.addClient(client);
        this.initialSpace.addClient(client);
    }

    move({ from, to }: { from: MultyxPlugin, to: MultyxPlugin }) {
        from.clients.forEach(c => {
            from.removeClient(c);
            to.addClient(c);
        });
    }
}
