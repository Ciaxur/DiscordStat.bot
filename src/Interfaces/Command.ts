import { DiscordenoMessage } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { CMD_ORIGIN } from '../Commands/index.ts';

export interface CommandMap {
  [cmd: string]: {
    exec: (msg: DiscordenoMessage, cmd: Command) => Promise<any>,
    description: string,
  },
}

export interface Command {
  cmd:          string,     // Extracted Command
  cmdOrigin:    CMD_ORIGIN, // Origin Type of Extracted Command
  userId:       string,     // User's ID that executed the Command
  directArg:    string,     // Following Argument
  arguments:    string[],   // All Raw Arguments
  execute: (msg: DiscordenoMessage, cmd: Command) => Promise<any>,
}