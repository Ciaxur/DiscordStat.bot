import { Message } from 'https://deno.land/x/discordeno@10.5.0/mod.ts';
import { Model } from 'https://deno.land/x/denodb@v1.0.24/lib/model.ts';
import { CommandMap } from '../Interfaces/Command.ts';
import { IPrecenseLog } from '../Interfaces/Database.ts';
import * as utils from '../Helpers/utils.ts';
import { StatusType } from '../Interfaces/Database.ts';
import { PrecenseLogModel, UserModel } from '../Database/index.ts';

/**
 * Handles Uptime Command. Replies with last most recent
 *  uptime metric since LAST OFFLINE END
 * @param msg Message Object
 */
async function command_uptime(msg: Message): Promise<any> {
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
    })
    .catch(err => {
      console.log('Error:', err);
      return msg.reply(`🐞 Something bad happend! Please report to Devs. Timestamp: ${Date.now()}`);
    });
}

export const USER_COMMANDS: CommandMap = {
  'help': async (msg: Message) => { // TODO:
    return msg.reply('Helping...');
  },
  'uptime': command_uptime,
};