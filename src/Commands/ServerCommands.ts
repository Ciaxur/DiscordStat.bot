import { Message } from 'https://deno.land/x/discordeno@10.5.0/mod.ts';
import { CommandMap, Command } from '../Interfaces/Command.ts';
import { GuildActivityModel, GuildModel } from '../Database/index.ts';
import { IGuildActivity, IGuild } from '../Interfaces/Database.ts';
import Config from '../config.ts';

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

/**
 * Prints Bot Information
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
 async function command_info(msg: Message, cmd: Command): Promise<any> {
  // Get Total Guilds Stored
  const totalGuilds = (await GuildModel.count()) || 0;
  
  return msg.send({
    embed: {
      title: 'Information',
      description: `Discord Statistics Bot that monitors user statistics on a server, with the end goal of a personalized User and Server Statistics Experience much like Spotify's Wrapped.
      Follow Development at: https://github.com/Ciaxur/DiscordStat.bot
      Support the Developers by donating. Use \`!donate\` for more info.

      This bot is currently in **${totalGuilds} Server${totalGuilds > 1 ? 's' : ''}**`,
      footer: {
        text: `Version ${Config.version}`,
      },
    },
  });
}

export const SERVER_COMMANDS: CommandMap = {
  'server-interaction': {
    exec: command_server_interaction,
    description: 'Prints the current server\'s user interaction with this bot',
  },
  'info': {
    exec: command_info,
    description: 'Prints bot information',
  },
};