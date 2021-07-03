/*
  Handles Presence changes and modifications
*/

import { PresenceUpdate } from 'https://deno.land/x/discordeno@11.2.0/mod.ts';
import { Model } from 'https://deno.land/x/denodb@v1.0.38/lib/model.ts';
import { v4 } from 'https://deno.land/std@0.100.0/uuid/mod.ts';

// Database & Utils
import { PrecenseLogModel } from '../Database/index.ts';
import { IPrecenseLog, StatusType } from '../Interfaces/Database.ts';
import { statusEnumFromString } from '../Helpers/utils.ts';

// Logging System
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();


/**
 * Handles updating User Presence on Database
 *  based on Presence state change
 * @param user User Model relating to presence state
 * @param presence New Presence State from Discord
 */
export async function updateUserPresence(user: Model, presence: PresenceUpdate) {
  // Check if there is a pending Status
  const entryResult = await PrecenseLogModel
    .where('userID', user.userID as string)
    .orderBy('created_at', 'desc')
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
        .then(() => Log.Info(`User ${user.userID} precense log updated.`))
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