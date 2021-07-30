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
import { statusEnumFromString } from '../Helpers/utils.ts';

// Logging System
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

// Cache System
import { 
  PRECENSE_ENTRY_TTL, PRESENCE_ENTRY_CACHE,
  BOT_NOTIFY_DELAY_CACHE, BOT_NOTIFY_DELAY_TTL,
} from '../Helpers/Cache.ts';

/**
 * Handles checking if a Bot's Presence State changes and notifies
 *  the subscribed party of that change
 * @param botUser The Bot User Entry
 * @param newPresence New Presence (online, dnd, idle, invisible)
 */
export async function checkAndNotifyBotTracking(botUser: IUser, newPresence: string) {
  if (BOT_NOTIFY_DELAY_CACHE.get(botUser.userID)) return;
  else BOT_NOTIFY_DELAY_CACHE.set(botUser.userID, botUser, BOT_NOTIFY_DELAY_TTL);
  
  Log.level(2).Internal('checkAndNotifyBotTracking', 'Checking if should notifying users of bot presence change');

  // Check Cache
  let entry: IPrecenseLog | null = PRESENCE_ENTRY_CACHE.get(botUser.userID.toString()) || null;
  
  // Check if Presence Changed
  const status: StatusType = statusEnumFromString(newPresence);
  if (!entry) {
    const entryResult = await PrecenseLogModel
      .where('userID', botUser.userID)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();
    entry = entryResult.length ? (entryResult as any)[0] : null;
  }

  if (entry) {
    // Cache the entry
    PRESENCE_ENTRY_CACHE.set(botUser.userID.toString(), entry, PRECENSE_ENTRY_TTL);
    
    const pEntry: IPrecenseLog = entry;
    const pStatusID = parseInt(pEntry.statusID as any);

    // Same as Entry, no new precense to log
    if (pEntry.endTime === null && pStatusID === status) {
      Log.level(3).Print('No new precense for bot. Not notifying anyone.');
      return;
    }
  }

  // Get tracking entries
  const tracking_entries: IBotTracker[] = await BotTrackerModel
    .where('botId', botUser.userID)
    .get() as any;
  
  // Presence Changed, notify all
  Log.level(1).Info(`Notifying ${tracking_entries.length} users of bot ${botUser.username}[${botUser.userID}] presence change to ${newPresence}`);
  for (const entry of tracking_entries) {
    return sendDirectMessage(BigInt(entry.userId), `**${botUser.username}[${botUser.userID}]**: Presence Changed to \`${newPresence}\``);
  }
}