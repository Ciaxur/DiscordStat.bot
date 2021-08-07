/*
  Handles Presence changes and modifications
*/

import { PresenceUpdate } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { v4 } from 'https://deno.land/std@0.101.0/uuid/mod.ts';

// Database & Utils
import { PRECENSE_DELAY_TTL, PRESENCE_DELAY_CACHE } from '../Helpers/Cache.ts';
import { IUser, StatusType } from '../Interfaces/Database.ts';
import { statusEnumFromString } from '../Helpers/utils.ts';

// Logging System
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

// LocalStorage
import { presenceLocalStorage_instance } from '../Helpers/LocalStorage/index.ts'



/**
 * Handles updating User Presence on Database
 *  based on Presence state change
 * @param user User Model relating to presence state
 * @param presence New Presence State from Discord
 */
export async function updateUserPresence(user: IUser, presence: PresenceUpdate) {
  if (PRESENCE_DELAY_CACHE.get(user.userID)) return;
  else PRESENCE_DELAY_CACHE.set(user.userID, user, PRECENSE_DELAY_TTL);
  
  // Setup Status ID
  const status: StatusType = statusEnumFromString(presence.status);

  // Check LocalStorage
  return presenceLocalStorage_instance.get(user.userID.toString())

    // Found pending status entry
    .then(pEntry => {
      // Update ONLY if status type is Different
      const pStatusID = parseInt(pEntry.statusID as any);

      // UPDATE: Status Differs
      if (pStatusID !== status) {

        // CREATE: new Entry
        const uuid = v4.generate().split('-').pop();
        
        // NOTE: Creation closes off Endtime
        presenceLocalStorage_instance.add(user.userID.toString(), {
          precenseID: uuid,
          userID: user.userID,
          statusID: status,
          startTime: new Date().toUTCString(),
          endTime: null,
        } as any)
          .then(() => Log.level(1).Info(`User ${user.userID} precense log updated to ${presence.status}.`))
          .catch(err => {
            Log.Error(`UpdateUserPresence: User Presence\'s Endtime could not be updated from ${presence.status}.`, err);
            Log.ErrorDump('UpdateUserPresence: User Presence Update Error', err, user, presence);
          });
      }

      // Same as Entry, no new precense to log
      else if (pEntry.endTime === null && pStatusID === status) {
        Log.level(2).Print('No new precense to log. Same as before.');
        return;
      }

    })

    // No Entry found
    .catch(_ => {
      // CREATE: new Entry
      const uuid = v4.generate().split('-').pop();

      presenceLocalStorage_instance.add(user.userID.toString(), {
        precenseID: uuid,
        userID: user.userID,
        statusID: status,
        startTime: new Date().toUTCString(),
        endTime: null,
      } as any)
        .then(() => Log.level(1).Info(`User ${user.userID} precense log updated to ${presence.status}.`))
        .catch(err => {
          Log.Error(`UpdateUserPresence: User Presence\'s Endtime could not be updated from ${presence.status}.`, err);
          Log.ErrorDump('UpdateUserPresence: User Presence Update Error', err, user, presence);
        });
    });
}