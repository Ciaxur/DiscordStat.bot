import { DiscordenoMessage } from 'https://deno.land/x/discordeno@11.2.0/mod.ts';

export interface CommandMap {
  [cmd: string]: {
    exec: (msg: DiscordenoMessage, cmd: Command) => Promise<any>,
    description: string,
  },
}

export interface Command {
  cmd:          string,     // Extracted Command
  userId:       string,     // User's ID that executed the Command
  directArg:    string,     // Following Argument
  arguments:    string[],   // All Raw Arguments
  execute: (msg: DiscordenoMessage, cmd: Command) => Promise<any>,
}