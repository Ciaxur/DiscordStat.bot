import { v4 } from 'https://deno.land/std@0.100.0/uuid/mod.ts';
import { DiscordenoMessage, sendDirectMessage } from 'https://deno.land/x/discordeno@11.2.0/mod.ts';
import { Model } from 'https://deno.land/x/denodb@v1.0.24/lib/model.ts';
import { CommandMap, Command } from '../Interfaces/Command.ts';
import { IPrecenseLog, IUser, IBotTracker, ITimestamps } from '../Interfaces/Database.ts';
import * as utils from '../Helpers/utils.ts';
import { StatusType } from '../Interfaces/Database.ts';
import { PrecenseLogModel, UserModel, BotTrackerModel } from '../Database/index.ts';
import { ITimeDifference } from '../Helpers/utils.ts';
import { Cache } from '../Helpers/Cache.ts';
import { SERVER_COMMANDS } from './ServerCommands.ts';
import CONFIG from '../config.ts';
import Logger from '../Logging/index.ts';

// CACHE & LOGING
const Log = Logger.getInstance();
const UPTIME_CACHE = new Cache<IWeeklyUptime>(10);
const USER_CACHE = new Cache<IUser>(10);

export const UPTIME_CACHE_TTL = 1 * 60 * 1000;    // 1  Minute
export const USER_CACHE_TTIL  = 10 * 60 * 1000;   // 10 Minutes

interface IWeeklyUptime {
  startDate: Date,
  endDate: Date,
  week_dt: ITimeDifference,
}


/**
 * Handles Uptime Command. Replies with last most recent
 *  uptime metric since LAST OFFLINE END
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_uptime(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  return UserModel.find(msg.authorId.toString())
    .then(async (user) => {
      if (!user) {
        return msg.reply('No metrics stored for user');
      }

      // Latest Stored OFFLINE precense
      const precenseLogs = (await PrecenseLogModel
        .where('userID', user.userID as string)
        .where('statusID', StatusType.offline.toString())
        .orderBy('created_at', 'desc')
        .limit(1)
        .get()) as Model[];
      
      // Handle no Stored Data found
      if (!precenseLogs.length) {
        return msg.reply('No recent found metrics found');
      }

      // Construct Data
      const recentOfflinePrecense: IPrecenseLog = precenseLogs[0] as any;

      // Construct Time difference string since OFFLINE
      const dt_str = utils.getTimeDifferenceString(Date.now() - recentOfflinePrecense.endTime.getTime());

      return msg.reply(`You've been online for ${dt_str.str}. 
        **Online Timestamp**: ${recentOfflinePrecense.startTime.toUTCString()}`);
    });
}

/**
 * Handles Weekly Avg. Uptime Command. Replies with the average
 *  uptime for the week
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_weekUptime(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  return UserModel.find(msg.authorId.toString())
    .then(async (user) => {
      if (!user) {
        return msg.reply('No metrics stored for user');
      }

      // Check if in Cache Hit or Stale
      const userObj: IUser = user as any;

      // GET CACHED ENTRY
      let cached_entry = UPTIME_CACHE.get(userObj.userID);
      
      // Stale or Cache Miss
      if (!cached_entry) {
        // Latest Stored OFFLINE precense
        const startDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // Past 7 Days
        const precenseLogs = (await PrecenseLogModel
          .where('userID', user.userID as string)
          .where('startTime', '>=', startDate.toUTCString())
          .orderBy('created_at', 'asc')
          .get()) as Model[];

        // Handle no Stored Data found
        if (!precenseLogs.length) {
          return msg.reply('No recent found metrics found');
        }

        // Calculate week uptime
        const avg_uptime_ms = precenseLogs.reduce((total, entry: any) => (
          total + (parseInt((entry as IPrecenseLog).statusID as any) !== StatusType.offline
            ? (((entry as IPrecenseLog).endTime?.getTime() || Date.now()) - (entry as IPrecenseLog).startTime.getTime())
            : 0
          )
        ), 0);
        const week_dt = utils.getTimeDifferenceString(avg_uptime_ms);

        // Store Cache
        cached_entry = {
          startDate,
          endDate: new Date(),
          week_dt,
        };
        UPTIME_CACHE.set(userObj.userID, cached_entry, UPTIME_CACHE_TTL);
      }

      // Clean up Cache
      return msg.reply(`For the past week, you're uptime has been ${cached_entry.week_dt.str}
        **Timestamp:** ${cached_entry.startDate.toUTCString()} - ${cached_entry.endDate.toUTCString()}`);
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

    **User-Specific Commands**
  `;
  
  return msg.send({
    embed: {
      title: 'Help Menu',
      description: (
        // User Commands
        Object.entries(USER_COMMANDS)
          .reduce((acc, [key, val]) => (acc + `- **${key}**: ${val.description}\n`), initialMessage) +

        // Server Commands
        Object.entries(SERVER_COMMANDS)
          .reduce((acc, [key, val]) => (acc + `- **${key}**: ${val.description}\n`), '\n**Server-Specific Commands**\n')
      ),
    },
  });
}

/**
 * Retrieves project Version, replying to sender
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_version(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  return msg.reply(`Version ${CONFIG.version}`);
}

/**
 * Prints the status of whether the user's data is
 *  being actively stored or not and total stored data
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_tracking_status(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  return UserModel.find(msg.authorId.toString())
    .then(async (user) => {
      if (!user) {
        return msg.reply('No metrics stored for user');
      }

      // Get all logs relating to user
      const precenseLogs = (await PrecenseLogModel
        .where('userID', user.userID as string)
        .get()) as Model[];

      return msg.reply({
        embed: {
          title: 'User Tracking Status',
          description: `**Tracking Status**: ${(user as any as IUser).disableTracking ? 'Disabled' : 'Enabled'}
            **Total Logs Stored:** ${precenseLogs.length}`
        },
      });
    });
}

/**
 * Sets tracking status given by user
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_tracking_set(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  // Expect direct argument to be [true/false]
  if (cmd.directArg === undefined || !['true', 'false'].includes(cmd.directArg.toLowerCase())) {
    return msg.reply(`Invalid command usage: Expecting argument to be passed \`${cmd.cmd} [true/false]\` `);
  }

  // Update Tracking Setting
  return UserModel
    .where('userID', msg.authorId.toString())
    .update('disableTracking', cmd.directArg.toLowerCase() === 'true' ? false : true)
    .then(() => {
      Log.Internal('command_tracking_set', `User ${msg.authorId.toString()} Tracking Updated to ${cmd.directArg}`);
      return msg.reply(`Tracking updated to: **${cmd.directArg.toLocaleLowerCase()}**`);
    })
    .catch(err => {
      Log.Error('Tracking Update Error:', err);
      return err;
    });
}

/**
 * Removes stored logs for user
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_clear_data(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  return PrecenseLogModel
    .where('userID', msg.authorId.toString())
    .delete()
    .then(() => msg.reply('All logged data have been removed 😺'));
}

/**
 * Prints information for how to donate to this Bot
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_donate(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  msg.send({
    embed: {
      title: 'Bot Donation ❤️',
      image: {
        url: 'https://ethereum.org/static/a110735dade3f354a46fc2446cd52476/0ee04/eth-home-icon.png',
      },
      description: `Donating helps support the development of this bot in the form of future decentralized currency :).
        - **Ethereum**: 0x1281AD6ce28FD668cf42Ea369ba19413515bD025`
    },
  })
}

/**
 * Toggles bot tracking for a user
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
 async function command_toggle_bot_tracking(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  // Expect direct argument to be the user id
  if (cmd.directArg === undefined) {
    return msg.reply(`Invalid command usage: Expecting argument to be passed \`${cmd.cmd} [bot-id]\``);
  }

  // Check if user is being tracked in the first place
  const user: IUser | undefined = (await UserModel.find(cmd.directArg)) as any;
  if (!user) {
    return msg.reply('The user provided is not being tracked by me');
  }

  // ONLY Bots can be tracked like that
  else if (user.isBot !== true) {
    return msg.reply('The user provided is not a bot! I cannot track non-bot users');
  }
  
  
  // Create a new Bot Tracker Entry if not available
  const botTrackEntry: IBotTracker[] = await BotTrackerModel
    .where('botId', cmd.directArg)
    .where('userId', cmd.userId)
    .get() as any;
  
  if (!botTrackEntry.length) {
    const uuid = v4.generate().split('-').pop();
    const entry = await BotTrackerModel.create({
      createdAt: new Date(),
      trackId: uuid,
      botId: cmd.directArg,
      userId: cmd.userId,
    } as any);

    Log.Internal('botTrackEntry', `New Bot Tracking Entry '${uuid}': [bot:${cmd.directArg}] [user:${cmd.userId}]`);
    return msg.reply(`Added bot tracking for bot '${cmd.directArg}`);
  }

  // Add/remove the user from the notification list of the bot (Toggle)
  else {
    const entry = botTrackEntry[0];
    
    await BotTrackerModel.deleteById(entry.trackId);
    Log.Internal('botTrackEntry', `Removed Bot Tracking Entry '${entry.trackId}': [bot:${entry.botId}] [user:${entry.userId}]`);
    
    return msg.reply(`Removed bot tracking entry for '${entry.botId}'`);
  }
}


/**
 * DMs a list for all bot tracking for a user
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_list_bot_tracking(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  const botTrackEntries: (IBotTracker & ITimestamps)[] = await BotTrackerModel
    .where('userId', cmd.userId)
    .get() as any;

  if (botTrackEntries.length) {
    let list_str = `**Detailed list of ${botTrackEntries.length} Bots being tracked:**\n`;
    
    for (const entry of botTrackEntries) {
      // Check if User info in Cache
      let bot_user = USER_CACHE.get(entry.botId);
      if (!bot_user) {
        bot_user = (await UserModel.find(entry.botId)) as any;
        if (!bot_user) {
          throw new Error(`Bot User ${entry.botId} not found in Database`);
        }
        
        Log.Info(`Adding ${bot_user.userID} to User Cache`);
        USER_CACHE.set(bot_user.userID, bot_user, USER_CACHE_TTIL);
      }

      // Append Information
      const tracking_started = utils.getTimeDifferenceString(Date.now() - entry.createdAt.getTime());
      list_str += `- ${bot_user.username} [*${bot_user.userID}*]: tracked since ${tracking_started.str}\n`;
    }

    sendDirectMessage(BigInt(cmd.userId), list_str);
    return msg.reply(`You have ${botTrackEntries.length} Bots being tracked. I DM'ed you a detailed list`);
  } else {
    return msg.reply('You have no bots being tacked');
  }
}


export const USER_COMMANDS: CommandMap = {
  'help': {
    exec: command_help,
    description: 'Print the Help Menu',
  },
  'tracking-status': {
    exec: command_tracking_status,
    description: 'Prints status of tracking enable/disable for user',
  },
  'tracking-set': {
    exec: command_tracking_set,
    description: 'Sets tracking state given by user argument. !tracking-set [true/false]',
  },
  'toggle-bot-tracking': {
    exec: command_toggle_bot_tracking,
    description: 'Toggles user being notified of bot\'s status change. !toggle-bot-tracking [bot-id]',
  },
  'list-bot-tracking': {
    exec: command_list_bot_tracking,
    description: 'DMs a list for all Bots being tracked to user',
  },
  'clear-data': {
    exec: command_clear_data,
    description: 'Clears all stored logs of user',
  },
  'uptime': {
    exec: command_uptime,
    description: 'Prints User\'s most recent uptime',
  },
  'week-uptime': {
    exec: command_weekUptime,
    description: 'Prints User\'s uptime during the past 7 days',
  },
  'donate': {
    exec: command_donate,
    description: 'Prints Bot instructions for donating',
  },
  'version': {
    exec: command_version,
    description: 'Prints Bot\'s current version',
  }
};