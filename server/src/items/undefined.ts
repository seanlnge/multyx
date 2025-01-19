import type { Client } from "../agents/client";
import type { MultyxTeam } from "../agents/team";
import { Edit } from "../utils/native";

export default class MultyxUndefined {
    value: undefined;
    agent: Client | MultyxTeam;
    propertyPath: string[];

    constructor(agent: Client | MultyxTeam, propertyPath: string[]) {
        this.agent = agent;
        this.propertyPath = propertyPath;
        this.relayChanges();
    }

    /**
     * Send an EditUpdate to all public agents
     */
    private relayChanges() {
        this.agent.server[Edit](this, new Set(this.agent.clients));
    }
}