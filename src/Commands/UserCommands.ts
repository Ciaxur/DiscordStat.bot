import { v4 } from 'https://deno.land/std@0.101.0/uuid/mod.ts';
import { DiscordenoMessage, sendDirectMessage, getUser } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { Model } from 'https://deno.land/x/denodb@v1.0.38/lib/model.ts';
import { CommandMap, Command } from '../Interfaces/Command.ts';
import Graph from 'https://deno.land/x/deno_chart@1.1.0/mod.ts';
import { IPrecenseLog, IUser, IBotTracker, ITimestamps } from '../Interfaces/Database.ts';
import * as utils from '../Helpers/utils.ts';
import { StatusType } from '../Interfaces/Database.ts';
import { PrecenseLogModel, UserModel, BotTrackerModel } from '../Database/index.ts';
import { ITimeDifference, stringFromStatusEnum } from '../Helpers/utils.ts';
import { Cache } from '../Helpers/Cache.ts';
import Logger from '../Logging/index.ts';

// LocalStorage
import { 
  botNotificationLocalStorage_instance,
  userLocalStorage_instance,
  presenceLocalStorage_instance,
} from '../Helpers/LocalStorage/index.ts';

// LOCAL CACHE & LOGING
const Log = Logger.getInstance();
const UPTIME_CACHE = new Cache<IWeeklyUptime>(10);
const UPTIME_CACHE_TTL = 1 * 60 * 1000;    // 1  Minute

// GRAPH CACHE & OPTIONS
interface IGraphBlobCache {
  timestamp:  number,
  sortedKeys: string[],
  blob:       Blob,
}
const GRAPH_BLOB_CACHE = new Cache<IGraphBlobCache>(100);
const GRAPH_BLOB_CACHE_TTL = 1 * 60 * 60 * 1000; // 1 Hour
const GRAPH_COLORS = [
  '#F25260', '#69BFBF', '#F2E6D0',
  '#F25252', '#F0CA4D', '#E37B40',
  '#E74C3C', '#ECF0F1', '#3498DB',
  '#2980B9', '#46B39D', '#DE5B49'
];


interface IWeeklyUptime {
  startDate: Date,
  endDate: Date,
  week_dt: ITimeDifference,
}


/**
 * Handles Uptime Command. Replies with last most recent
 *  uptime metric since last presence
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_uptime(msg: DiscordenoMessage, _: Command): Promise<any> {
  // Check stored latest presence
  return presenceLocalStorage_instance.get(msg.authorId.toString())
    .then(presence => {
      const startTime = new Date(presence.startTime);

      // Construct Time difference string since in the current state
      const dt_str = utils.getTimeDifferenceString(Date.now() - startTime.getTime());

      // Convert status type
      const status_str = stringFromStatusEnum(presence.statusID);
      const status_upper_str = status_str[0].toUpperCase() + status_str.substr(1);

      return msg.reply(`You've been ${status_str} for ${dt_str.str}. 
        **${status_upper_str} Timestamp**: ${startTime.toUTCString()}`);
    })
    .catch(() => msg.reply('No metrics stored for user'));
}

/**
 * Handles Graphing the weekly uptime of the user. Replies with last most recent
 *  weekly uptime metric stored. Caches the result for lower processing time
 * @param msg DiscordenoMessage Object
 * @param cmd Parsed Command Object
 */
async function command_graph_uptime(msg: DiscordenoMessage, cmd: Command): Promise<any> {
  const graph = new Graph({
    height: 720,
    width: 1280,
    
    backgroundColor: {
      r: 30,
      g: 30,
      b: 30,
      a: 1.0,
    },
    
    titleText: 'Uptime',
    xAxisText: 'Day',
    yAxisText: 'Hours',
    bar_width:  88,

    xTextColor:     'rgba(255,255,255,1)',
    xSegmentColor:  'rgba(255,255,255,0.5)',
    yTextColor:     'rgba(255,255,255,1)',
    ySegmentColor:  'rgba(255,255,255,0.5)',
  });

  // Resolve Message helper function
  const resolveMsg = (entry: IGraphBlobCache) => {
    const { blob, sortedKeys, timestamp } = entry;
    return msg.send({
      embeds: [{
        title: 'Graphed Weekly Uptime',
        description: `Uptime Graph generated for time period between ${sortedKeys[0]} and ${sortedKeys[sortedKeys.length - 1]}`,
        footer: {
          text: timestamp.toString(),
        },
      }],
      file: {
        blob,
        name: `${cmd.userId}-graph-uptime.png`,
      },
    });
  }

  return UserModel.find(cmd.userId)
    .then(async (user) => {
      if (!user) {
        return msg.reply('No metrics stored for user');
      }

      // Check Cached Image
      const cached_blob = GRAPH_BLOB_CACHE.get(cmd.userId);
      if (cached_blob) {
        return resolveMsg(cached_blob);
      }
      
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
      
      const weeklyEntries: { [dateStr: string]: number } = {};
      for (const entry of (precenseLogs as any as IPrecenseLog[])) {
        const endTime = entry.endTime ? entry.endTime : new Date();
        const key = entry.startTime.toDateString();
        weeklyEntries[key] = (weeklyEntries[key] || 0) + ((endTime.getTime() - entry.startTime.getTime()) / (1000 * 60 * 60));
      }
      
      let i = 0;
      const sortedKeys = Object.keys(weeklyEntries).sort((a, b) => (new Date(a)).getTime() - (new Date(b).getTime()));
      for (const key of sortedKeys) {
        graph.add({
          color: GRAPH_COLORS[Math.floor(Math.random() * GRAPH_COLORS.length)],
          val: weeklyEntries[key],
          label: (key).toString(),
        });
      }

      graph.draw();

      // Cache Result
      const _graphResult = {
        blob: new Blob([graph.toBuffer()], { type: 'image/png' }),
        sortedKeys,
        timestamp: Date.now(),
      };
      GRAPH_BLOB_CACHE.set(cmd.userId, _graphResult, GRAPH_BLOB_CACHE_TTL);

      return resolveMsg(_graphResult);
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
      // Get user from LocalStorage
      let bot_user: IUser;
      
      try {
        bot_user = await userLocalStorage_instance.get(entry.botId);
      } catch(err) {
        Log.level(1).Warning('UserCommands: Bot user not found');

        const _user_from_discord = await getUser(BigInt(entry.botId));
        bot_user = {
          userID: _user_from_discord.id,
          disableTracking: null,
          isBot: _user_from_discord.bot === undefined ? false : _user_from_discord.bot,
          username: _user_from_discord.username,
        };
        
        userLocalStorage_instance.add(_user_from_discord.id, bot_user);
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
  'graph-uptime': {
    exec: command_graph_uptime,
    description: 'Generates and outputs user\'s uptime as a graph',
  },
  'week-uptime': {
    exec: command_weekUptime,
    description: 'Prints User\'s uptime during the past 7 days',
  },
};