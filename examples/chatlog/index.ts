import Multyx from '../../server/index';
import express from 'express';

const server = express().listen(8080, () => console.log('server started'));
const multyx = new Multyx.MultyxServer(server);

multyx.all.self.set('messages', []);

multyx.all.self.get('messages').allowItemChange = false;
multyx.all.self.get('messages').allowItemDeletion = false;

 
multyx.on(Multyx.Events.Connect, (client: Multyx.Client) => {
    multyx.all.self.get('messages').push(client.uuid + ' joined');
});
multyx.on(Multyx.Events.Edit, () => {
    console.log(multyx.all.self.get('messages'));
});