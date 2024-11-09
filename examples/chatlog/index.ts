import Multyx from '../../server/index';
import express from 'express';

const server = express().listen(8080, () => console.log('server started'));
const multyx = new Multyx.MultyxServer(server);

multyx.on(Multyx.Events.Connect, (client: Multyx.Client) => {
    client.self.set('messages', ['hello world']);
});

multyx.on(Multyx.Events.Edit, (client: Multyx.Client, data: any) => {
    console.log(client.self.get('messages').raw);
});