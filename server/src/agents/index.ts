import Client from './client';
import MultyxTeam from './team';
import { Controller, ControllerState, Input } from './controller';

type Agent = Client | MultyxTeam;

const MultyxClients = new MultyxTeam("all");

export {
    Agent,
    MultyxClients,
    Client,
    Controller,
    ControllerState,
    Input,
    MultyxTeam
}