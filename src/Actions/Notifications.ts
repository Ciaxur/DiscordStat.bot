/* 
  Handles checking and then notifying another party
    of an occured event
*/
import { sendDirectMessage } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { PrecenseLogModel, BotTrackerModel } from '../Database/index.ts';
import {
  IPrecenseLog, IUser, StatusType,
  IBotTracker,
} from '../Interfaces/Database.ts';
import { Model } from 'https://deno.land/x/denodb@v1.0.38/lib/model.ts';
import { statusEnumFromString } from '../Helpers/utils.ts';

// Logging System
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

/**
 * Handles checking if a Bot's Presence State changes and notifies
 *  the subscribed party of that change
 * @param botUser The Bot User Entry
 * @param newPresence New Presence (online, dnd, idle, invisible)
 */
export async function checkAndNotifyBotTracking(botUser: IUser, newPresence: string) {
  Log.level(2).Internal('checkAndNotifyBotTracking', 'Checking if should notifying users of bot presence change');

  // Get tracking entries
  const tracking_entries: IBotTracker[] = await BotTrackerModel
    .where('botId', botUser.userID)
    .get() as any;
  
  // Check if Presence Changed
  const status: StatusType = statusEnumFromString(newPresence);
  const entryResult = await PrecenseLogModel
    .where('userID', botUser.userID)
    .orderBy('created_at', 'desc')
    .limit(1)
    .get();

  if (entryResult.length) {
    const pEntry: IPrecenseLog & Model = (entryResult as any)[0];
    const pStatusID = parseInt(pEntry.statusID as any);

    // Same as Entry, no new precense to log
    if (pEntry.endTime === null && pStatusID === status) {
      Log.level(3).Print('No new precense for bot. Not notifying anyone.');
      return;
    }
  }
  
  // Presence Changed, notify all
  Log.level(1).Info(`Notifying ${tracking_entries.length} users of bot ${botUser.username}[${botUser.userID}] presence change to ${newPresence}`);
  for (const entry of tracking_entries) {
    return sendDirectMessage(BigInt(entry.userId), `**${botUser.username}[${botUser.userID}]**: Presence Changed to \`${newPresence}\``);
  }
}