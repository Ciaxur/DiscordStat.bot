import { IPrecenseLog, ITimestamps } from '../../Interfaces/Database.ts';
import { PrecenseLogModel } from '../../Database/index.ts';
import { LocalStorage } from './index.ts';
import { DatabaseConnection} from '../../Database/Connection.ts';

// Logging
import Logging from '../../Logging/index.ts';
const Log = Logging.getInstance();

export default class PresenceLocalStorage extends LocalStorage<IPrecenseLog> {
  constructor() {
    super((presence, map) => map.set(presence.userID, presence), async () => {
      const client = DatabaseConnection.getClientInstance();
      if (!client) throw new Error('No established database connection');

      Log.Debug('Querying Presence Logs...');
      const result = await client.queryArray(`
        SELECT precense_id, user_id, status_id, start_time, end_time, created_at, updated_at FROM "PrecenseLog" 
        WHERE end_time IS NULL
      `);
      
      return result.rows
        .map(val => ({
          precenseID: val[0],
          userID: val[1],
          statusID: val[2],
          startTime: val[3],
          endTime: val[4],
          createdAt: val[5],
          updatedAt: val[6],
        } as IPrecenseLog & ITimestamps));
    });
  }


  /**
   * Finds and returns the presence of a given User's ID
   *  if it's available
   *  - Restricted to LOCAL gets only 
   *    -> Doesn't check Database (checked in constructor)
   * @param key User's ID
   */
  public async get(key: string): Promise<IPrecenseLog> {
    // Local Check
    const _user_presence = this.data.get(key);
    if (_user_presence) {
      return Promise.resolve(_user_presence);
    }

    // Precense of given user not found in LocalStorage
    return Promise.reject(`Presence of User '${key}' not found in LocalStorage`);
  }

  /**
   * Handles storing user in the Database and/or locally
   *  - Resolves closing the user's precense if one was found
   * @param key Unique ID of user
   * @param val User's NEW Presence data
   */
  public async add(key: string, val: IPrecenseLog): Promise<void> {
    const _user_presence = this.data.get(key) as IPrecenseLog;

    // Precense Update
    if (_user_presence) {
      PrecenseLogModel
        .where('precenseID', _user_presence.precenseID)
        .update({ endTime: new Date().toUTCString() })
        .then(() => Log.level(1).Info(`User ${key} precense log end time updated.`))
        .catch(err => {
          Log.Error(`User[${key}] Presence\'s Endtime could not be updated.`, err);
          Log.ErrorDump('User Presence LocalStorage Endtime Update error:', err, key, val, _user_presence);
        });
    }

    // Add/Overwrite new Precense
    this.data.set(key, val);

    return PrecenseLogModel.create(val as any)
      .then(() => Log.level(1).Info(`LocalStorage: User Presence '${val.statusID}[${key}] add to Database`))
      .catch(err => {
        Log.level(1).Warning(`LocalStorage Error: User Presence '${key}' not created: `, err);
      });
  }
};