/*
  Handles Presence changes and modifications
*/

import { PresenceUpdate } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { Model } from 'https://deno.land/x/denodb@v1.0.38/lib/model.ts';
import { v4 } from 'https://deno.land/std@0.101.0/uuid/mod.ts';

// Database & Utils
import { Cache } from '../Helpers/Cache.ts';
import { PrecenseLogModel } from '../Database/index.ts';
import { IPrecenseLog, IUser, StatusType } from '../Interfaces/Database.ts';
import { statusEnumFromString } from '../Helpers/utils.ts';

// Logging System
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

// User Presence being Handled
//  NOTE: To preven multiple entries since user could
//    be present in multiple servers where the bot is,
//    create a "Presence Cache" that has a TTL which is the
//    delay of presence update.
const PRESENCE_DELAY_CACHE = new Cache<IUser>(10);
const PRECENSE_DELAY_TTL = 500;                // 500ms Delay

/**
 * Handles updating User Presence on Database
 *  based on Presence state change
 * @param user User Model relating to presence state
 * @param presence New Presence State from Discord
 */
export async function updateUserPresence(user: IUser, presence: PresenceUpdate) {
  if (PRESENCE_DELAY_CACHE.get(user.userID)) return;
  else PRESENCE_DELAY_CACHE.set(user.userID, user, PRECENSE_DELAY_TTL);
  
  // Check if there is a pending Status
  const entryResult = await PrecenseLogModel
    .where('userID', user.userID)
    .orderBy('startTime', 'desc')
    .limit(1)
    .get();

  // Setup Status ID
  const status: StatusType = statusEnumFromString(presence.status);

  // Close off Entry
  if (entryResult.length) {
    // Update ONLY if status type is Different
    const pEntry: IPrecenseLog & Model = (entryResult as any)[0];
    const pStatusID = parseInt(pEntry.statusID as any);

    // Status Differs
    if (pEntry.endTime === null && pStatusID !== status) {
      PrecenseLogModel
        .where('precenseID', pEntry.precenseID)
        .update({ endTime: new Date().toUTCString() })
        .then(() => Log.Info(`User ${user.userID} precense log updated to ${presence.status}.`))
        .catch(err => Log.Error('User Precense\'s Endtime could not be updated.', err));
    } 
    
    // Same as Entry, no new precense to log
    else if (pEntry.endTime === null && pStatusID === status) {
      Log.Print('No new precense to log. Same as before.');
      return;
    }
  }

  // Create a new Entry
  const uuid = v4.generate().split('-').pop();
  PrecenseLogModel.create({
    precenseID: uuid,
    userID: user.userID,
    statusID: status,
    startTime: new Date().toUTCString(),
    endTime: null,
  } as any)
    .then(plog => Log.Info('Precense Log Created for ', user.userID))
    .catch(err => Log.Error('Precense Log could not be created: ', err));
}