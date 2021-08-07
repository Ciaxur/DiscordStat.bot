import { DiscordenoMessage } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { CommandMap, Command } from '../Interfaces/Command.ts';
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
  
  return msg.send({
    embeds: [
      {
        title: 'LocalStorage Statistics',
        description: 
          '**Bot Tracker**\n' +
          `Entries: ${botTracker_ls.size()}\n\n` +

          '**User**\n' +
          `Entries: ${user_ls.size()}\n\n` +
          
          '**Guild**\n' +
          `Entries: ${guild_ls.size()}\n\n`
      },
    ]
  })
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
};