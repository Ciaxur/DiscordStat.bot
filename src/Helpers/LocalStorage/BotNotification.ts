import { IBotTracker } from '../../Interfaces/Database.ts';
import { BotTrackerModel } from '../../Database/index.ts';
import { LocalStorage } from './index.ts';

// Logging
import Logging from '../../Logging/index.ts';
const Log = Logging.getInstance();

export default class BotNotification extends LocalStorage<IBotTracker, IBotTracker[]> {
  constructor() {
    // Append a list of Entries keyed to Bot's ID
    super((botUser, map) => {
      const _entry = map.get(botUser.botId);
      map.set(botUser.botId, _entry ? [botUser, ..._entry] : [botUser])
    }, async () => {
      Log.Debug('Querying Bot Trackers...');
      return BotTrackerModel.get() as any;
    });
  }


  /**
   * Finds and returns a List of Tracked entires
   *  if it's available (else emptpy List)
   * @param key Bot ID
   */
  public async get(key: string): Promise<IBotTracker[]> {
    // Generic Check: Local & Database
    const _bot_notif_entry = await this._get(key, BotTrackerModel, 'Bot Tracker');
    if (_bot_notif_entry !== null) {
      return Promise.resolve(_bot_notif_entry);
    }

    // Not in DB nor Local so Bot is not tracked
    return Promise.resolve([]);
  }


  /**
   * Handles storing Bot Tracker in the Database and/or locally
   * @param key Unique ID of Bot being tracked
   * @param val BotTracker data
   */
  public add(key: string, val: IBotTracker): Promise<void> {
    const _entries = this.data.get(key) || [];
    
    // No found entries, create entry in DB
    if (_entries.length === 0) {
      BotTrackerModel.create(val as any)
        .then(() => Log.level(1).Internal('LocalStorage', `New Bot Tracker '${val.userId}[${key}] tracking -> bot[${val.botId}]`))
        .catch(err => {
          Log.level(1).Warning(`LocalStorage Error: Bot Tracker '${key}' not created: `, err);
        });
    }

    // Store Locally
    this.data.set(key, [..._entries, val]);
    return Promise.resolve();
  }

  /**
   * Removes bot tracking entry for given user
   * @param entry Entry instance to remove
   * @throws If no bot entry found
   */
  public async remove(entry: IBotTracker): Promise<void> {
    const _filtered_entry = this.data.get(entry.botId)
      ?.filter(elt => elt.userId !== entry.userId);
    
    if (_filtered_entry === undefined) {
      return Promise.reject('LocalStorage Error: Bot Tracking could not be removed, no entries found');
    }
    
    BotTrackerModel.deleteById(entry.trackId);
    this.data.set(entry.botId, _filtered_entry);

    Log.level(1).Internal('LocalStorage', `Removed Bot Tracking Entry '${entry.trackId}': [bot:${entry.botId}] [user:${entry.userId}]`);
    return Promise.resolve();
  }
};