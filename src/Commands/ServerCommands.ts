import { DiscordenoMessage, getGuild } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { CommandMap, Command } from '../Interfaces/Command.ts';
import { GuildActivityModel, GuildModel } from '../Database/index.ts';
import { IGuildActivity, IGuild } from '../Interfaces/Database.ts';
import { 
  guildLocalStorage_instance,
} from '../Helpers/LocalStorage/index.ts';

/**
 * Prints Command Interaction of users within the server
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_server_interaction(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  // Get Guild Entry
  const guildEntry: IGuild | undefined = (await GuildModel.find(msg.guildId.toString())) as any;

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
    embeds: [{
      title: `${guildEntry.guildName} - Bot Interaction`,
      description: Object
        .entries(resultTable)
        .reduce((msg, [key, val]) => msg + `- ${key}: ${val}\n`, initialMessage)
    }],
  })
}

/**
 * Sets the preferred Bot Response channel
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_server_set_bot_channel(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  // Make sure Guild is set
  const guild = await getGuild(msg.guildId);
  
  // Owner Only!
  if (guild.ownerId.toString() === cmd.userId) {
    // Validate args given
    if (!cmd.directArg) {
      return msg.send(`Invalid command! Command usage: \`${cmd.cmd} [channel name]\``);
    }
    
    await guildLocalStorage_instance.update(guild.id.toString(), {
      responseChannel: cmd.directArg,
    });
    
    return msg.send(`Preferred Response Channel updated to '${cmd.directArg}'`);
  } else {
    return msg.send('Only the owner of the server can set the Channel');
  }
}

/**
 * Prints the preferred Bot Response channel
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_server_show_bot_channel(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  // Check if Guild is Cached or get from DB
  const guild = await guildLocalStorage_instance.get(msg.guildId.toString());
  
  if (guild.responseChannel)
    return msg.send(`The set bot's reponse channel is '${guild.responseChannel}'`);
  else
    return msg.send('There is no set reponse channel. I respond in any channel');
}

/**
 * Clears the preferred Bot Response channel
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_server_clear_bot_channel(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  // Make sure Guild is set
  const guild = await getGuild(msg.guildId);

  // Owner Only!
  if (guild.ownerId.toString() === cmd.userId) {
    await guildLocalStorage_instance.update(guild.id.toString(), {
      responseChannel: null,
    });
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
};