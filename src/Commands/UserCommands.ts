import { v4 } from 'https://deno.land/std@0.101.0/uuid/mod.ts';
import { DiscordenoMessage, sendDirectMessage } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { Model } from 'https://deno.land/x/denodb@v1.0.38/lib/model.ts';
import { CommandMap, Command } from '../Interfaces/Command.ts';
import { IPrecenseLog, IUser, IBotTracker, ITimestamps } from '../Interfaces/Database.ts';
import * as utils from '../Helpers/utils.ts';
import { StatusType } from '../Interfaces/Database.ts';
import { PrecenseLogModel, UserModel, BotTrackerModel } from '../Database/index.ts';
import { ITimeDifference } from '../Helpers/utils.ts';
import { Cache } from '../Helpers/Cache.ts';
import Logger from '../Logging/index.ts';

// SHARED CACHE
import { USER_DB_CACHE, USER_DB_CACHE_TTL } from '../Helpers/Cache.ts';

// LocalStorage
import { botNotificationLocalStorage_instance } from '../Helpers/LocalStorage/index.ts';

// LOCAL CACHE & LOGING
const Log = Logger.getInstance();
const UPTIME_CACHE = new Cache<IWeeklyUptime>(10);
const UPTIME_CACHE_TTL = 1 * 60 * 1000;    // 1  Minute


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
  return UserModel.find(cmd.userId)
    .then(async (user) => {
      if (!user) {
        return msg.reply('No metrics stored for user');
      }

      // Latest Stored OFFLINE precense
      const precenseLogs = (await PrecenseLogModel
        .where('userID', user.userID as string)
        .where('statusID', StatusType.offline.toString())
        .orderBy('startTime', 'desc')
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
  return UserModel.find(cmd.userId)
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
 * Prints the status of whether the user's data is
 *  being actively stored or not and total stored data
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_tracking_status(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  return UserModel.find(cmd.userId)
    .then(async (user) => {
      if (!user) {
        return msg.reply('No metrics stored for user');
      }

      // Get all logs relating to user
      const precenseLogs = (await PrecenseLogModel
        .where('userID', user.userID as string)
        .get()) as Model[];

      return msg.reply({
        embeds: [{
          title: 'User Tracking Status',
          description: `**Tracking Status**: ${(user as any as IUser).disableTracking ? 'Disabled' : 'Enabled'}
            **Total Logs Stored:** ${precenseLogs.length}`
        }],
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
    .where('userID', cmd.userId)
    .update('disableTracking', cmd.directArg.toLowerCase() === 'true' ? false : true)
    .then(() => {
      Log.level(1).Internal('command_tracking_set', `User ${cmd.userId} Tracking Updated to ${cmd.directArg}`);
      return msg.reply(`Tracking updated to: **${cmd.directArg.toLocaleLowerCase()}**`);
    })
    .catch(err => {
      Log.Error(`Tracking Update Error for ${msg.authorId}:`, err);
      Log.ErrorDump('Tracking Update:', err, msg, cmd);
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
    .where('userID', cmd.userId)
    .delete()
    .then(() => msg.reply('All logged data have been removed 😺'));
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
  const botTrackEntry: IBotTracker[] = (await botNotificationLocalStorage_instance.get(cmd.directArg))
    .filter(entry => entry.userId === cmd.userId);

  
  if (!botTrackEntry.length) {
    const uuid = (v4.generate().split('-').pop()) as string;
    botNotificationLocalStorage_instance.add(cmd.directArg, {
      createdAt: new Date().toUTCString(),
      trackId: uuid,
      botId: cmd.directArg,
      userId: cmd.userId,
    } as IBotTracker);

    return msg.reply(`Added bot tracking for bot '${cmd.directArg}'`);
  }

  // Add/remove the user from the notification list of the bot (Toggle)
  else {
    const entry = botTrackEntry[0];
    await botNotificationLocalStorage_instance.remove(entry);
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
      let bot_user = USER_DB_CACHE.get(entry.botId);
      if (!bot_user) {
        bot_user = (await UserModel.find(entry.botId)) as any;
        if (!bot_user) {
          throw new Error(`Bot User ${entry.botId} not found in Database`);
        }
        
        Log.level(3).Info(`Adding ${bot_user.userID} to User Cache`);
        USER_DB_CACHE.set(bot_user.userID, bot_user, USER_DB_CACHE_TTL);
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
};