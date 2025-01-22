export type Options = {
    port?: number,
    secure?: boolean,
    uri?: string,
};

export const DefaultOptions: Options = {
    port: 443,
    secure: false,
    uri: 'localhost'
};