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
    }, () => {
      // Remove NULL entries from DB
      const client = DatabaseConnection.getClientInstance();
      if (!client) throw new Error('No established database connection');

      Log.Debug('Removing Null Presence Logs from DB...');
      client.queryArray(`
        DELETE FROM "PrecenseLog" 
        WHERE end_time IS NULL
      `)
        .then(res => Log.Debug('Null EndTime Presence Logs removed from DB'))
        .catch(err => Log.Error('Null EndTime Presence Logs FAILED to be removed from DB:', err));
    }, { storage_name: 'presence' });

    // Setup Callbacks on Bulk Query
    this._db_queue.onSuccess = (entries: IPrecenseLog[]) => (
      Log.level(2).Internal('PresenceLocalStorage', `Query Create Event: Created ${entries.length} entries`)
    );
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
      // Close and append entry to DB
      this._add_entry_to_db({
        ..._user_presence,
        endTime: new Date().toUTCString(),
      } as any, PrecenseLogModel);
      Log.level(2).Info(`User ${key} precense log end time updated and queued to Database.`);
    }

    // Add/Overwrite new Precense
    this.data.set(key, val);
  }

  /**
   * Overload Flushing Queries to also write unclosed Presence entries
   */
  public async _close(): Promise<any> {
    // Close regularly (create pending entries)
    await super._close();

    // Additionally write unclosed Presence Entries
    Log.Debug('PresenceLocalStorage: Storing unclosed entries');
    const entries = [...this.data.values()]
    return PrecenseLogModel
      .create(entries as any[])
      .then(() => Log.Internal('PresenceLocalStorage', `Stored ${entries.length} unclosed entries`));
  }
};