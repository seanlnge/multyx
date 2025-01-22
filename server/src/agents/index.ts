import Client from './client';
import MultyxTeam from './team';
import { Controller, ControllerState, Input } from './controller';

type Agent = Client | MultyxTeam;

export {
    Agent,
    Client,
    Controller,
    ControllerState,
    Input,
    MultyxTeam
}