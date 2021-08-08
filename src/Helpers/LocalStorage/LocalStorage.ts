import Logger from '../../Logging/index.ts';
const Log = Logger.getInstance();


// Database Query Queue
const QUERY_TIMEOUT = 1 * 60 * 1000;
interface QueryQueue<T> {
  model:    any,    // Used DenoDB Model
  data:     T[],    // Queued Data

  // Callbacks
  onSuccess: ((entries: T[]) => void) | null,
  onError: ((err: Error) => void) | null,
}

// E = Entry | T = Data(Stored)
type StorageSetFunction<E, D> = (data: E, internalMap: Map<string, D>) => void;

export abstract class LocalStorage<E, T=E> {
  private _data: Map<string, T>;
  private _ready: boolean = false;
  private _timeout: number;

  // Internal Storage Functions
  private _store_fn: StorageSetFunction<E, T>; // The metohd in which to store data

  // Database Event Data
  protected _db_queue: QueryQueue<T>;
  private   _db_queue_timeout_id: number | null;

  
  /**
   * Constructs data with optional given initialization function
   * @param initFunc (Optional) Should return a list of Entries
   * @param timeout (Optional, Default = 5000) Milliseconds to timeout trying to load data from initFunc
   *  - Timeout of -1 will infinitly retry every 1.5s
   */
  constructor(store_fn: StorageSetFunction<E, T>, initFunc?: () => Promise<E[]>, initFuncCallback?: () => void, timeout = 5000) {
    this._store_fn = store_fn;
    this._data = new Map();
    this._timeout = timeout;
    this._db_queue = {
      data: [],
      model: null,
      onSuccess: null,
      onError: null,
    }
    this._db_queue_timeout_id = null;

    if (initFunc) {
      const _fn = async () => {
        try {
          const entries = await initFunc();
          Log.Debug('LocalStorage Entries Loaded: ', entries.length);
          for (const elt of entries)
            this._store_fn(elt, this._data);
          
          this._ready = true;

          // Optional Callback
          if (initFuncCallback) initFuncCallback();
        } catch(err) {
          Log.Warning('LocalStorage Init Function Error: ', err);
          // Repeat until success or timed out
          this._timeout -= 1500;
          if (this._timeout > 0) {
            Log.level(1).Warning('LocalStorage: Retrying with timeout: ', this._timeout);
            setTimeout(_fn, 1500);
          }
        }
      };
      _fn();
    } else {
      this._ready = true;
    }
  }


  /**
   * @returns Ready state of LocalStorage
   */
  public isReady(): boolean {
    return this._ready;
  }

  /**
   * Internal Data Map access
   */
  public get data(): Map<string, T> {
    return this._data;
  }

  /**
   * @returns Queued up queries
   */
  public getQueueSize(): number {
    return this._db_queue.data.length;
  }

  /**
   * Returns the total keys of internal data
   */
  public size(): number {
    return this._data.size;
  }

  /**
   * Finds and returns the value associated with given key  
   *  if it's available
   * @param key Unique key retrieving data for
   */
  public abstract get(key: string): Promise<T>;

  /**
   * Handles storing given key-value pairs
   * @param key Unique key for data
   */
  public abstract add(key: string, val: E): Promise<void>;

  /**
   * General Data get with Database logic based on given Model
   * @param key Unique ID of entry's key
   * @param val Value of the entry
   * @param model The Database model that will be used
   * @param storageName The name of the LocalStorage
   * @returns New/Found Entry or null if neither
   */
  protected async _get(key: string, model: any, storageName: string): Promise<T | null> {
    const _guild_entry = this.data.get(key);
    const _storage_name_lower = storageName.toLocaleLowerCase();

    // Early return
    if (_guild_entry) {
      Log.level(2).Debug(`LocalStorage: ${storageName} '${key}' Get found`);
      return Promise.resolve(_guild_entry);
    }

    // Check Database
    try {
      const _data_db_entry = await model.find(key);
      if (_data_db_entry) {
        Log.level(2).Debug(`LocalStorage: ${storageName} '${key}' Get found in Database`);
        this.data.set(key, _data_db_entry as any);
        return Promise.resolve(_data_db_entry as any);
      }
    } catch(err) {
      Log.Error(`${storageName} LocalStorage DB.Find<${_storage_name_lower}>(${key}) type(${typeof(key)}) Error: `, err);
      Log.ErrorDump(`${storageName} LocalStorage DB.Find<${_storage_name_lower}>(${key}) Error: `, err);
      return Promise.reject(`${storageName} LocalStorage DB.Find<${_storage_name_lower}>(${key}) Error: ${err}`);
    }

    return Promise.resolve(null);
  }

  /**
   * Handles adding given entry to the model with queue and bulk
   *  queries
   * @param data Data of the entry
   * @param model The Database model that will be used
   */
  protected _add_entry_to_db(data: T, model: any): void {
    // Keep track of given DB Model
    if (!this._db_queue.model && model) 
      this._db_queue.model = model;

    // Queue up data
    this._db_queue.data.push(data);

    // Set timeout event
    if (this._db_queue_timeout_id === null) {
      this._db_queue_timeout_id = setTimeout(this._event_create_query_db.bind(this), QUERY_TIMEOUT);
    }
  }

  // EVENTS
  /**
   * Model DB Create event: Bulk Create to supplied model
   */
  private _event_create_query_db(): void {
    // Reset timeout
    this._db_queue_timeout_id = null;
    
    // Copy data over to allow other processes from accessing the data
    const _entries = this._db_queue.data;
    this._db_queue.data = [];

    Log.level(1).Debug(`LocalStorage: Bulk Create ${_entries.length} entries`);
    this._db_queue.model
      .create(_entries)
      .then(() => {
        if (this._db_queue.onSuccess) this._db_queue.onSuccess()
        else {
          Log.level(2).Internal('LocalStorage', `Query Create Event: Created ${_entries.length} entries`)
        }
      })
      .catch((err: Error) => {
        // Revert _entries back into queue
        this._db_queue.data = [
          ...this._db_queue.data,
          ..._entries,
        ];

        // Call Error Callback
        if (this._db_queue.onError) this._db_queue.onError(err);
        else {
          Log.Error('LocalStorage: Query Create Event Error: ', err);
          Log.ErrorDump('LocalStorage: Query Create Event Error', err, _entries);
        }

        // Reset timeout
        Log.level(2).Debug('LocalStorage Create Query Event: Reset timeout');
        this._db_queue_timeout_id = setTimeout(this._event_create_query_db.bind(this), QUERY_TIMEOUT);
      });
  }
};