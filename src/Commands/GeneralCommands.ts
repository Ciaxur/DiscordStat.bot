import { DiscordenoMessage } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { CommandMap, Command } from '../Interfaces/Command.ts';
import { GuildModel } from '../Database/index.ts';
import { SERVER_COMMANDS, USER_COMMANDS } from './index.ts';
import Configuration from '../Configuration/index.ts';
const CONFIG = Configuration.getInstance();


/**
 * Prints Bot Information
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_info(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  // Get Total Guilds Stored
  const totalGuilds = (await GuildModel.count()) || 0;
  
  return msg.send({
    embeds: [{
      title: 'Information',
      description: `Discord Statistics Bot that monitors user statistics on a server, with the end goal of a personalized User and Server Statistics Experience much like Spotify's Wrapped.
      Follow Development at: https://github.com/Ciaxur/DiscordStat.bot
      Support the Developers by donating. Use \`!donate\` for more info.

      This bot is currently in **${totalGuilds} Server${totalGuilds > 1 ? 's' : ''}**`,
      footer: {
        text: `Version ${CONFIG.config.version}`,
      },
    }],
  });
}

/**
 * Prints help menu for user
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_help(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  let initialMessage = `**Announcements**
    Follow Development at: https://github.com/Ciaxur/DiscordStat.bot

    **General Commands**
  `;

  return msg.send({
    embeds: [{
      title: 'Help Menu',
      description: (
        // General Commands
        Object.entries(GENERAL_COMMANDS)
          .reduce((acc, [key, val]) => (acc + `- **${key}**: ${val.description}\n`), initialMessage) +
        
        // User Commands
        Object.entries(USER_COMMANDS)
          .reduce((acc, [key, val]) => (acc + `- **${key}**: ${val.description}\n`), '\n**User-Specific Commands**\n') +

        // Server Commands
        Object.entries(SERVER_COMMANDS)
          .reduce((acc, [key, val]) => (acc + `- **${key}**: ${val.description}\n`), '\n**Server-Specific Commands**\n')
      ),
    }],
  });
}

/**
 * Retrieves project Version, replying to sender
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_version(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  return msg.reply(`Version ${CONFIG.config.version}`);
}

/**
 * Prints information for how to donate to this Bot
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_donate(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  msg.send({
    embeds: [{
      title: 'Bot Donation ❤️',
      image: {
        url: 'https://ethereum.org/static/a110735dade3f354a46fc2446cd52476/0ee04/eth-home-icon.png',
      },
      description: `Donating helps support the development of this bot in the form of future decentralized currency :).
        - **Ethereum**: 0x1281AD6ce28FD668cf42Ea369ba19413515bD025`
    }],
  })
}

export const GENERAL_COMMANDS: CommandMap = {
  'help': {
    exec: command_help,
    description: 'Print the Help Menu',
  },
  'info': {
    exec: command_info,
    description: 'Prints bot information',
  },
  'donate': {
    exec: command_donate,
    description: 'Prints Bot instructions for donating',
  },
  'version': {
    exec: command_version,
    description: 'Prints Bot\'s current version',
  },
};