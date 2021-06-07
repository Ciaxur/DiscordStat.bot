import { Message } from 'https://deno.land/x/discordeno@10.5.0/mod.ts';
import { Model } from 'https://deno.land/x/denodb@v1.0.24/lib/model.ts';
import { CommandMap, Command } from '../Interfaces/Command.ts';
import { IPrecenseLog, IUser } from '../Interfaces/Database.ts';
import * as utils from '../Helpers/utils.ts';
import { StatusType } from '../Interfaces/Database.ts';
import { PrecenseLogModel, UserModel } from '../Database/index.ts';
import { UPTIME_CACHE, UPTIME_CACHE_EXPIRE, restrictUptimeCache } from './Cache.ts';
import CONFIG from '../config.ts';



/**
 * Handles Uptime Command. Replies with last most recent
 *  uptime metric since LAST OFFLINE END
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
async function command_uptime(msg: Message, cmd: Command): Promise<any> {
  return UserModel.find(msg.author.id)
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
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
async function command_weekUptime(msg: Message, cmd: Command): Promise<any> {
  return UserModel.find(msg.author.id)
    .then(async (user) => {
      if (!user) {
        return msg.reply('No metrics stored for user');
      }

      // Check if in Cache Hit or Stale
      const userObj: IUser = user as any;

      // Stale or Cache Miss
      if(!UPTIME_CACHE[userObj.userID] && UPTIME_CACHE[userObj.userID].timestamp.getTime() + UPTIME_CACHE_EXPIRE > Date.now()) {
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
        UPTIME_CACHE[userObj.userID] = {
          weekUptime: {
            startDate,
            endDate: new Date(),
            week_dt,
          },
          timestamp: new Date(),
        };
      }

      const cache = UPTIME_CACHE[userObj.userID];

      // Clean up Cache
      restrictUptimeCache(UPTIME_CACHE, 10);
      return msg.reply(`For the past week, you're uptime has been ${cache.weekUptime.week_dt.str}
        **Timestamp:** ${cache.weekUptime.startDate.toUTCString()} - ${cache.weekUptime.endDate.toUTCString()}`);
    });
}

/**
 * Prints help menu for user
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
async function command_help(msg: Message, cmd: Command): Promise<any> {
  return msg.send({
    embed: {
      title: 'Help Menu',
      description: Object.entries(USER_COMMANDS)
        .reduce((acc, [ key, val ]) => ( acc + `**${key}**: ${val.description}\n`), ''),
    },
  });
}

/**
 * Retrieves project Version, replying to sender
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
async function command_version(msg: Message, cmd: Command): Promise<any> {
  return msg.reply(`Version ${CONFIG.version}`);
}

/**
 * Prints the status of whether the user's data is
 *  being actively stored or not and total stored data
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
async function command_tracking_status(msg: Message, cmd: Command): Promise<any> {
  return UserModel.find(msg.author.id)
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
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
async function command_tracking_set(msg: Message, cmd: Command): Promise<any> {
  // Expect direct argument to be [true/false]
  if (cmd.directArg === undefined || !['true', 'false'].includes(cmd.directArg.toLowerCase())) {
    return msg.reply(`Invalid command usage: Expecting argument to be passed \`${cmd.cmd} [true/false]\` `);
  }

  // Update Tracking Setting
  return UserModel
    .where('userID', msg.author.id)
    .update('disableTracking', cmd.directArg.toLowerCase() === 'true' ? false : true)
    .then(() => {
      console.log(`User ${msg.author.id} Tracking Updated to ${cmd.directArg}`);
      return msg.reply(`Tracking updated to: **${cmd.directArg.toLocaleLowerCase()}**`);
    })
    .catch(err => {
      console.log('Tracking Update Error:', err);
      return err;
    });
}

/**
 * Removes stored logs for user
 * @param msg Message Object
 * @param cmd Parsed Command Object
 */
async function command_clear_data(msg: Message, cmd: Command): Promise<any> {
  return PrecenseLogModel
    .where('userID', msg.author.id)
    .delete()
    .then(() => msg.reply('All logged data have been removed 😺'));
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
  'version': {
    exec: command_version,
    description: 'Prints Bot\'s current version',
  }
};