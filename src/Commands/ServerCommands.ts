import { Message } from 'https://deno.land/x/discordeno@10.5.0/mod.ts';
import { CommandMap } from '../Interfaces/Command.ts';

export const SERVER_COMMANDS: CommandMap = {
  'server_status': {  // TODO:
    exec: async (msg: Message) => {
      return msg.reply('server statting...');
    },
    description: '',
  },
};