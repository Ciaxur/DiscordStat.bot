import { Message, getGuild } from 'https://deno.land/x/discordeno@10.5.0/mod.ts';
import { CommandMap, Command } from '../Interfaces/Command.ts';
import { GuildActivityModel, GuildModel } from '../Database/index.ts';
import { IGuildActivity, IGuild } from '../Interfaces/Database.ts';
import { GUILD_CACHE } from '../main.ts';
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

/**
 * Sets the preferred Bot Response channel
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
async function command_server_set_bot_channel(msg: Message, cmd: Command): Promise<any> {
  // Make sure Guild is set
  const guild = await getGuild(msg.guildID);
  
  // Owner Only!
  if (guild.owner_id === cmd.userId) {
    // Validate args given
    if (!cmd.directArg) {
      return msg.send(`Invalid command! Command usage: \`${cmd.cmd} [channel name]\``);
    }
    
    await GuildModel
      .where('guildID', guild.id)
      .update('responseChannel', cmd.directArg);
    
    // Make sure updated Guild is stale
    GUILD_CACHE.expire(guild.id, -1);
      
    return msg.send(`Preferred Response Channel updated to '${cmd.directArg}'`);
  } else {
    return msg.send('Only the owner of the server can set the Channel');
  }
}

/**
 * Prints the preferred Bot Response channel
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
async function command_server_show_bot_channel(msg: Message, cmd: Command): Promise<any> {
  // Check if Guild is Cached or get from DB
  let guild = GUILD_CACHE.get(msg.guildID) || (await GuildModel.find(msg.guildID) as any) as IGuild;

  if (guild.responseChannel)
    return msg.send(`The set bot's reponse channel is '${guild.responseChannel}'`);
  else
    return msg.send('There is no set reponse channel. I respond in any channel');
}

/**
 * Clears the preferred Bot Response channel
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
async function command_server_clear_bot_channel(msg: Message, cmd: Command): Promise<any> {
  // Make sure Guild is set
  const guild = await getGuild(msg.guildID);

  // Owner Only!
  if (guild.owner_id === cmd.userId) {
    await GuildModel
      .where('guildID', guild.id)
      .update('responseChannel', null);

    // Make sure updated Guild is stale
    GUILD_CACHE.expire(guild.id, -1);

    return msg.send('Preferred Response Channel has been cleared');
  } else {
    return msg.send('Only the owner of the server can set the Channel');
  }
}

export const SERVER_COMMANDS: CommandMap = {
  'set-bot-channel': {
    exec: command_server_set_bot_channel,
    description: 'Sets the Server Channel that the bot should respond to [owner only]'
  },
  'show-bot-channel': {
    exec: command_server_show_bot_channel,
    description: 'Sets the Server Channel that the bot should respond to'
  },
  'clear-bot-channel': {
    exec: command_server_clear_bot_channel,
    description: 'Clears the Server Channel that the bot should respond to [owner only]'
  },
  'server-interaction': {
    exec: command_server_interaction,
    description: 'Prints the current server\'s user interaction with this bot',
  },
  'info': {
    exec: command_info,
    description: 'Prints bot information',
  },
};