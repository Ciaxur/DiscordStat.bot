/* 
  Handles checking and then notifying another party
    of an occured event
*/
import { sendDirectMessage } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import {
  IPrecenseLog, IUser, StatusType,
} from '../Interfaces/Database.ts';
import { statusEnumFromString } from '../Helpers/utils.ts';

// Logging System
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

// Cache System
import { 
  BOT_NOTIFY_DELAY_CACHE, BOT_NOTIFY_DELAY_TTL,
} from '../Helpers/Cache.ts';

// LocalStorage
import { 
  botNotificationLocalStorage_instance,
  presenceLocalStorage_instance,
} from '../Helpers/LocalStorage/index.ts';

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

  // Parse Status String to type
  const status: StatusType = statusEnumFromString(newPresence);
  
  // Check LocalStorage
  return presenceLocalStorage_instance.get(botUser.userID.toString())

    // Bot Presence Entry found
    .then(async (entry) => {
      // Check if Presence Changed
      const pEntry: IPrecenseLog = entry;
      const pStatusID = parseInt(pEntry.statusID as any);

      // Same as Entry, no new precense to log
      if (pStatusID === status) {
        Log.level(3).Print('No new precense for bot. Not notifying anyone.');
        return;
      }
      
      // Get tracking entries
      const bot_tracker_entries = await botNotificationLocalStorage_instance.get(botUser.userID);

      // Presence Changed, notify all
      Log.level(1).Info(`Notifying ${bot_tracker_entries.length} users of bot ${botUser.username}[${botUser.userID}] presence change to ${newPresence}`);
      for (const entry of bot_tracker_entries) {
        return sendDirectMessage(BigInt(entry.userId), `**${botUser.username}[${botUser.userID}]**: Presence Changed to \`${newPresence}\``);
      }
    })

    // Bot Presence Entry not found
    .catch(_ => {
      Log.level(1).Internal('checkAndNotifyBotTracking', `No Presence entry found for bot ${botUser.username}[${botUser.userID}]`);
    });
}