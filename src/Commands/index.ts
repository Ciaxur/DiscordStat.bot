import { SERVER_COMMANDS } from './ServerCommands.ts';
import { USER_COMMANDS } from './UserCommands.ts';
import { Command } from '../Interfaces/Command.ts';

const COMMAND_REGEX = /^!([\w-]+)\s?(\w+)?/;

export function parseCommand(str: string): Command | null {
  try {
    const [ _, cmd, arg ] = str.match(COMMAND_REGEX) as RegExpMatchArray;
    const args = str.split(' ').slice(1);
    const fn = USER_COMMANDS[cmd] || SERVER_COMMANDS[cmd];
    return {
      cmd,
      directArg: arg,
      arguments: args,
      execute: fn.exec || function() {},
      userId: '',
    };
  } catch(e) {
    return null;
  }
}
