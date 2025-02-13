export type Options = {
    port?: number,
    secure?: boolean,
    uri?: string,
    verbose?: boolean,
    logUpdateFrame?: boolean,
};

export const DefaultOptions: Options = {
    port: 8443,
    secure: false,
    uri: 'localhost',
    verbose: false,
    logUpdateFrame: false,
};