/*
  Handles Presence changes and modifications
*/

import { PresenceUpdate } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { Model } from 'https://deno.land/x/denodb@v1.0.38/lib/model.ts';
import { v4 } from 'https://deno.land/std@0.101.0/uuid/mod.ts';

// Database & Utils
import { PRECENSE_DELAY_TTL, PRESENCE_DELAY_CACHE } from '../Helpers/Cache.ts';
import { PrecenseLogModel } from '../Database/index.ts';
import { IPrecenseLog, IUser, StatusType } from '../Interfaces/Database.ts';
import { statusEnumFromString } from '../Helpers/utils.ts';

// Logging System
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

// Cache System
import { PRECENSE_ENTRY_TTL, PRESENCE_ENTRY_CACHE } from '../Helpers/Cache.ts';



/**
 * Handles updating User Presence on Database
 *  based on Presence state change
 * @param user User Model relating to presence state
 * @param presence New Presence State from Discord
 */
export async function updateUserPresence(user: IUser, presence: PresenceUpdate) {
  if (PRESENCE_DELAY_CACHE.get(user.userID)) return;
  else PRESENCE_DELAY_CACHE.set(user.userID, user, PRECENSE_DELAY_TTL);
  
  // Check Cache
  let precenseEntry: IPrecenseLog | null = null;
  const cachedEntry = PRESENCE_ENTRY_CACHE.get(user.userID.toString());
  if (cachedEntry) {
    precenseEntry = cachedEntry;
  }
  
  // Check if there is a pending Status
  if (!cachedEntry) {
    const entryResult = await PrecenseLogModel
      .where('userID', user.userID)
      .orderBy('startTime', 'desc')
      .limit(1)
      .get();
    precenseEntry = entryResult.length ? (entryResult as any)[0] : null;
  }

  // Setup Status ID
  const status: StatusType = statusEnumFromString(presence.status);

  // Close off Entry
  if (precenseEntry) {
    // Cache Entry
    PRESENCE_ENTRY_CACHE.set(user.userID.toString(), precenseEntry, PRECENSE_ENTRY_TTL);
    
    // Update ONLY if status type is Different
    const pEntry: IPrecenseLog= precenseEntry;
    const pStatusID = parseInt(pEntry.statusID as any);

    // UPDATE: Status Differs
    if (pEntry.endTime === null && pStatusID !== status) {
      PrecenseLogModel
        .where('precenseID', pEntry.precenseID)
        .update({ endTime: new Date().toUTCString() })
        .then(() => Log.level(1).Info(`User ${user.userID} precense log updated to ${presence.status}.`))
        .catch(err => {
          Log.Error(`User Presence\'s Endtime could not be updated from ${presence.status}.`, err);
          Log.ErrorDump('User Presence DB Update', err, user, presence);
        });
    } 
    
    // Same as Entry, no new precense to log
    else if (pEntry.endTime === null && pStatusID === status) {
      Log.level(2).Print('No new precense to log. Same as before.');
      return;
    }
  }

  // CREATE: new Entry
  const uuid = v4.generate().split('-').pop();
  PrecenseLogModel.create({
    precenseID: uuid,
    userID: user.userID,
    statusID: status,
    startTime: new Date().toUTCString(),
    endTime: null,
  } as any)
    .then(plog => {
      Log.level(2).Info('Precense Log Created for ', user.userID);
      PRESENCE_ENTRY_CACHE.set(user.userID.toString(), plog as any, PRECENSE_ENTRY_TTL);
    })
    .catch(err => {
      Log.Error('Precense Log could not be created: ', err);
      Log.ErrorDump('Precense Log could not be created:', err, user, presence);
    });
}