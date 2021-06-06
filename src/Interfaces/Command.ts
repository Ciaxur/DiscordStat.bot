import { Message } from 'https://deno.land/x/discordeno@10.5.0/mod.ts';

export interface CommandMap {
  [cmd: string]: (msg: Message) => Promise<any>,
}

export interface Command {
  cmd:          string,     // Extracted Command
  directArg:    string,     // Following Argument
  arguments:    string[],   // All Raw Arguments
  execute: (msg: Message) => Promise<any>,
}