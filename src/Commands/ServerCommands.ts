import { Message } from 'https://deno.land/x/discordeno@10.5.0/mod.ts';
import { CommandMap, Command } from '../Interfaces/Command.ts';
import { GuildActivityModel, GuildModel } from '../Database/index.ts';
import { IGuildActivity, IGuild } from '../Interfaces/Database.ts';


/**
 * Prints Command Interaction of users within the server
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
async function command_server_interaction(msg: Message, cmd: Command): Promise<any> {
  // Get Guild Entry
  const guildEntry: IGuild | undefined = (await GuildModel.find(msg.guildID)) as any;

  // Something weird happened! 
  if (!guildEntry) {
    return Promise.reject('Server Interaction - Guild not found');
  }

  // TODO: Cache previous sum based on Date
  //  - Having a last updated be the point of which to query
  const guildActivity: IGuildActivity[] = (await GuildActivityModel
    .where('guildID', guildEntry.guildID)
    .get()
  ) as any;

  // Construct Result Table
  const resultTable = guildActivity
    .reduce((acc, elt) => (
      {
        ...acc,
        [elt.command]: (acc[elt.command] || 0) + 1
      }
    ), {} as { [cmd: string]: number });

  
  let initialMessage = '**Total Commands Issued**:\n';
  return msg.send({
    embed: {
      title: `${guildEntry.guildName} - Bot Interaction`,
      description: Object
        .entries(resultTable)
        .reduce((msg, [key, val]) => msg + `- ${key}: ${val}\n`, initialMessage)
    },
  })
}


export const SERVER_COMMANDS: CommandMap = {
  'server-interaction': {
    exec: command_server_interaction,
    description: 'Prints the current server\'s user interaction with this bot',
  },
};