import type { Agent } from "../agents";
import { Edit } from "../utils/native";

export default class MultyxUndefined {
    value: undefined;
    relayedValue: undefined;
    agent: Agent;
    propertyPath: string[];

    constructor(agent: Agent, propertyPath: string[]) {
        this.agent = agent;
        this.propertyPath = propertyPath;
        this.relayChanges();
    }

    /**
     * Send an EditUpdate to all public agents
     */
    private relayChanges() {
        this.agent.server?.[Edit](this, new Set(this.agent.clients));
    }
}