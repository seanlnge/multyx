import type { Server } from "http";
import type { ServerOptions } from "ws";

export type Options = {
    tps?: number,
    port?: number,
    server?: Server,
    removeDisconnectedClients?: boolean,
    respondOnFrame?: boolean,
    sendConnectionUpdates?: boolean,
    websocketOptions?: ServerOptions,
};

export const DefaultOptions: Options = {
    tps: 10,
    port: 443,
    removeDisconnectedClients: true,
    respondOnFrame: true,
    sendConnectionUpdates: true,
    websocketOptions: {
        perMessageDeflate: false // Often causes backpressure on client
    },
};