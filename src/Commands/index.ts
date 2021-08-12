import { SERVER_COMMANDS } from './ServerCommands.ts';
import { USER_COMMANDS } from './UserCommands.ts';
import { DEV_COMMANDS } from './DevCommands.ts';
import { GENERAL_COMMANDS } from './GeneralCommands.ts';
import { Command } from '../Interfaces/Command.ts';

const COMMAND_REGEX = /^!([\w-]+)\s?([\w-]+)?/;

// Origin of the Command (Server, User, etc...)
export type CMD_ORIGIN = 'GENERAL' | 'SERVER' | 'USER' | 'DEV';

export function parseCommand(str: string): Command | null {
  try {
    const [ _, cmd, arg ] = str.match(COMMAND_REGEX) as RegExpMatchArray;
    const args = str.split(' ').slice(1);

    // Set Command Origin
    let fn = GENERAL_COMMANDS[cmd];
    let fn_origin: CMD_ORIGIN = 'GENERAL';
    if (!fn) {
      fn = USER_COMMANDS[cmd];
      fn_origin = 'USER';
    }
    if (!fn) {
      fn = SERVER_COMMANDS[cmd];
      fn_origin = 'SERVER';
    }
    if (!fn) {
      fn = DEV_COMMANDS[cmd];
      fn_origin = 'DEV'
    }

    return {
      cmd,
      cmdOrigin: fn_origin,
      directArg: arg,
      arguments: args,
      execute: fn.exec || function() {},
      userId: '',
    };
  } catch(e) {
    return null;
  }
}

export {
  USER_COMMANDS, SERVER_COMMANDS, GENERAL_COMMANDS,
}