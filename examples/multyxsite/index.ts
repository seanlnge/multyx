import Multyx from "multyx";

class Client {
    private client: Multyx.Client;
    private space: Space;

    public hidden: Record<string, any> = {};
    public shared: Record<string, any> = {};

    constructor(client: Multyx.Client) {
        this.client = client;
        this.shared = client.self.shared = {};

        Object.defineProperty(this, "shared", {
            get: () => this.shared,
            set: (value: Record<string, any>) => {
                this.shared = value;
                this.client.self.shared = value;
            }
        });
    }

    public setSpace(space: Space) {
        this.space = space;
    }

    public getSpace() {
        return this.space;
    }
}

interface Plugin {
    pluginName: string;
    states: string[];
    hiddenState: Record<string, any>;
    publicState: Record<string, any>;
    methods: Record<string, (...args: any[]) => any>;
}

interface Trigger {
    triggerName: string;
    code: string;
}

interface Space {
    spaceName: string;
}




const askName: Space = {
    spaceName: "askName",
}

const lobby: Space = {
    spaceName: "lobby",
}

const table: Space = {
    spaceName: "table",
}