import { DiscordenoMessage, DiscordActivityTypes, editBotStatus } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { CommandMap, Command } from '../Interfaces/Command.ts';
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

import Configuration from '../Configuration/index.ts';
const CONFIG = Configuration.getInstance();

// All Shared Cache Instances
import { 
  GUILD_CACHE, GUILD_CACHE_TTL,
  BOT_NOTIFY_DELAY_CACHE, BOT_NOTIFY_DELAY_TTL,
  PRESENCE_DELAY_CACHE, PRECENSE_DELAY_TTL,
  PRESENCE_ENTRY_CACHE, PRECENSE_ENTRY_TTL,
} from '../Helpers/Cache.ts';

// All LocalStorage Instances
import {
  botNotificationLocalStorage_instance,
  userLocalStorage_instance,
  guildLocalStorage_instance,
  presenceLocalStorage_instance,
} from '../Helpers/LocalStorage/index.ts';

/**
 * Main handler for the dev command. Handles routing to subcommands based
 *  on supplied arguments & permission
 * @param msg Discord Message Object
 * @param cmd Command Object
 */
async function dev_command_handler(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  // ONLY DEVS
  if (!CONFIG.config.dev.users.includes(msg.authorId.toString()))
    return;

  // Check sub-command executed?
  if (cmd.directArg === undefined) {
    return SUB_DEV_COMMANDS['help'].exec(msg, cmd); // Default -> Help
  }

  // Route to Subcommands
  const fn = SUB_DEV_COMMANDS[cmd.directArg];
  if (!fn)
    return msg.send(`Development sub-command '${cmd.directArg}' not found`);
  return fn.exec(msg, cmd);
}

/**
 * Development Subcommand that prints the help menu
 * @param msg Discord Message Object
 * @param cmd Command Object
 */
async function dev_subcommand_help(msg: DiscordenoMessage, _: Command): Promise<any> {
  let initialMessage = `**Announcements**
    This command is a Developer-Only command

    **Development Commands**
  `;

  return msg.send({
    embeds: [{
      title: 'Developer Help Menu',
      description: (
        // Main Commands
        Object.entries(DEV_COMMANDS)
          .reduce((acc, [key, val]) => (acc + `- **${key}**: ${val.description}\n`), initialMessage) +

        // Sub Commands
        Object.entries(SUB_DEV_COMMANDS)
          .reduce((acc, [key, val]) => (acc + `- **${key}**: ${val.description}\n`), '\n**[dev] Sub-Commands Commands**\n')
      ),
    }],
  });
  
}

/**
 * Development Subcommand that prints cache statistics
 * @param msg Discord Message Object
 * @param cmd Command Object
 */
async function dev_subcommand_print_stats_cache(msg: DiscordenoMessage, _: Command): Promise<any> {
  return msg.send({
    embeds: [
      {
        title: 'Cache Statistics',
        description: 
          '**Guild**\n' +
          `Entries: ${GUILD_CACHE.size()}\n` +
          `TTL: ${GUILD_CACHE_TTL}ms\n\n` +

          '**Bot Tracker Delay**\n' +
          `Entries: ${BOT_NOTIFY_DELAY_CACHE.size()}\n` +
          `TTL: ${BOT_NOTIFY_DELAY_TTL}ms\n\n` +
          
          '**Presence Delay**\n' +
          `Entries: ${PRESENCE_DELAY_CACHE.size()}\n` +
          `TTL: ${PRECENSE_DELAY_TTL}ms\n\n` +

          '**Presence Entry**\n' +
          `Entries: ${PRESENCE_ENTRY_CACHE.size()}\n` +
          `TTL: ${PRECENSE_ENTRY_TTL}ms\n\n`
      },
    ]
  })
}

/**
 * Development Subcommand that prints LocalStorage statistics
 * @param msg Discord Message Object
 * @param cmd Command Object
 */
async function dev_subcommand_print_stats_localstorage(msg: DiscordenoMessage, _: Command): Promise<any> {
  // Readability
  const botTracker_ls = botNotificationLocalStorage_instance;
  const user_ls = userLocalStorage_instance;
  const guild_ls = guildLocalStorage_instance;
  const presence_ls = presenceLocalStorage_instance;
  
  return msg.send({
    embeds: [
      {
        title: 'LocalStorage Statistics',
        description: 
          '**Bot Tracker**\n' +
          `Entries: ${botTracker_ls.size()}\n` +
          `Queued Entries: ${botTracker_ls.getQueueSize()}\n\n` +

          '**User**\n' +
          `Entries: ${user_ls.size()}\n` +
          `Queued Entries: ${user_ls.getQueueSize()}\n\n` +
          
          '**Guild**\n' +
          `Entries: ${guild_ls.size()}\n` +
          `Queued Entries: ${guild_ls.getQueueSize()}\n\n` +

          '**Presence**\n' +
          `Entries: ${presence_ls.size()}\n` +
          `Queued Entries: ${presence_ls.getQueueSize()}\n\n`
      },
    ]
  });
}


/**
 * Development Subcommand that sets the bot's custom status
 * @param msg Discord Message Object
 * @param cmd Command Object
 */
async function dev_subcommand_change_bot_status(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  const newStatus = cmd.arguments.length > 1 ? cmd.arguments.slice(1).join(' ') : '';
  
  editBotStatus({
    activities: [{
      createdAt: Date.now(),
      name: newStatus,
      type: DiscordActivityTypes.Custom,
    }],
    status: 'online',
  });

  msg.send(
    newStatus.length
    ? `Bot custom status set to '${newStatus}'`
    : 'Bot status cleared'
  );
}

/**
 * Initiates flush on LocalStorage Queues
 * @param msg Discord Message Object
 * @param cmd Command Object
 */
async function dev_subcommand_flush_localstorage_queue(msg: DiscordenoMessage, _: Command): Promise<any> {
  await Promise.all([
    userLocalStorage_instance._flush(),
    guildLocalStorage_instance._flush(),
    presenceLocalStorage_instance._flush(),
    botNotificationLocalStorage_instance._flush(),
  ])
    .then(() => msg.send('Flushed all LocalStorage Queues'))
    .catch(err => {
      Log.Error('Developer Command: Flush Error: ', err);
      msg.send({
        content: 'LocalStorage Flush Error Occured',
        embeds: [
          {
            description: JSON.stringify(err),
          },
        ],
      });
    });
}

export const DEV_COMMANDS: CommandMap = {
  'dev': {
    exec: dev_command_handler,
    description: 'Executes developer commands based on arguments',
  }
};

const SUB_DEV_COMMANDS: CommandMap = {
  'help': {
    exec: dev_subcommand_help,
    description: 'Print dev help menu',
  },
  'stats-cache': {
    exec: dev_subcommand_print_stats_cache,
    description: 'Prints Cache Statistics',
  },
  'stats-storage': {
    exec: dev_subcommand_print_stats_localstorage,
    description: 'Prints LocalStorage Statistics',
  },
  'set-bot-status': {
    exec: dev_subcommand_change_bot_status,
    description: 'Set the bot\'s current custom status'
  },
  'flush-storage-queue': {
    exec: dev_subcommand_flush_localstorage_queue,
    description: 'Flushes all LocalStorage Queues',
  },
};