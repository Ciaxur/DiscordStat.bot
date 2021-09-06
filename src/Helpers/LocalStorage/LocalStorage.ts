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

interface LocalStorageOptions {
  timeout:        number,
  storage_name:   string,
}

export abstract class LocalStorage<E, T=E> {
  private _data: Map<string, T>;
  private _ready: boolean = false;
  private _timeout: number;
  protected _storage_name: string = "local";

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
  constructor(store_fn: StorageSetFunction<E, T>, initFunc?: () => Promise<E[]>, initFuncCallback?: () => void, options?: Partial<LocalStorageOptions>) {
    this._store_fn = store_fn;
    this._data = new Map();
    this._timeout = options?.timeout || 5000;
    this._storage_name = options?.storage_name || this._storage_name;
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
          Log.Debug(`LocalStorage<${this._storage_name}> Entries Loaded: `, entries.length);
          for (const elt of entries)
            this._store_fn(elt, this._data);
          
          this._ready = true;

          // Optional Callback
          if (initFuncCallback) initFuncCallback();
        } catch(err) {
          Log.Warning(`LocalStorage<${this._storage_name}> Init Function Error: `, err);
          // Repeat until success or timed out
          this._timeout -= 1500;
          if (this._timeout > 0) {
            Log.level(1).Warning(`LocalStorage<${this._storage_name}>: Retrying with timeout: `, this._timeout);
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
   * Cleans up & flushes queued entries
   */
  public async _close() {
    if(this._db_queue_timeout_id)
      clearTimeout(this._db_queue_timeout_id);
    Log.level(1).Info(`Flushing LocalStorage<${this._storage_name}> Queued Queries...`);
    return this._event_create_query_db();
  }

  /**
   * Flushes Queued Entries
   */
  public async _flush() {
    return this._event_create_query_db();
  }
  
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
      Log.level(2).Debug(`LocalStorage<${this._storage_name}>: ${storageName} '${key}' Get found`);
      return Promise.resolve(_guild_entry);
    }

    // Check Database
    try {
      const _data_db_entry = await model.find(key);
      if (_data_db_entry) {
        Log.level(2).Debug(`LocalStorage<${this._storage_name}>: ${storageName} '${key}' Get found in Database`);
        this.data.set(key, _data_db_entry as any);
        return Promise.resolve(_data_db_entry as any);
      }
    } catch(err) {
      Log.Error(`${storageName} LocalStorage<${this._storage_name}> DB.Find<${_storage_name_lower}>(${key}) type(${typeof(key)}) Error: `, err);
      Log.ErrorDump(`${storageName} LocalStorage<${this._storage_name}> DB.Find<${_storage_name_lower}>(${key}) Error: `, err);
      return Promise.reject(`${storageName} LocalStorage<${this._storage_name}> DB.Find<${_storage_name_lower}>(${key}) Error: ${err}`);
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
   * Attempts to build create query for given entries. Splits up the query if
   *  it fails, pinpointing the issue
   * @param _entries Entries to build query
   */
  private async _event_create_query_db_helper(_entries: T[]): Promise<any> {
    Log.level(1).Debug(`LocalStorage<${this._storage_name}>: Bulk Create ${_entries.length} entries`);

    return this._db_queue.model
      .create(_entries)
      .then(() => {
        if (this._db_queue.onSuccess) this._db_queue.onSuccess(_entries)
        else {
          Log.level(2).Internal(`LocalStorage<${this._storage_name}>`, `Query Create Event: Created ${_entries.length} entries`);
        }
      })
      .catch((err: Error) => {
        // Handle ForeignKey Violation Error
        const isViolatesForeignKey = err.message.search('violates foreign key constraint') !== -1;
        if (isViolatesForeignKey) {
          // Try splitting up the query
          if (_entries.length > 1) {
            const half1 = _entries.slice(0, _entries.length / 2);
            const half2 = _entries.splice(_entries.length / 2, _entries.length);
            return Promise.all([
              this._event_create_query_db_helper(half1),
              this._event_create_query_db_helper(half2),
            ]);
          }

          // Drop the violation entry since it was already entered
          else {
            Log.Error(`LocalStorage<${this._storage_name}>: Dropping ForeignKey Violation Entry: `, JSON.stringify(_entries, null, '\t'));
            Log.ErrorDump(`LocalStorage<${this._storage_name}>: Dropping ForeignKey Violation Entry`, err, _entries);
            return;
          }
        }
        
        // Revert _entries back into queue
        this._db_queue.data = [
          ...this._db_queue.data,
          ..._entries,
        ];

        // Call Error Callback
        if (this._db_queue.onError) this._db_queue.onError(err);
        else {
          Log.Error(`LocalStorage<${this._storage_name}>: Query Create Event Error: `, err);
          Log.ErrorDump(`LocalStorage<${this._storage_name}>: Query Create Event Error`, err, _entries);
        }

        // Reset timeout
        Log.level(2).Debug(`LocalStorage<${this._storage_name}> Create Query Event: Reset timeout`);
        this._db_queue_timeout_id = setTimeout(this._event_create_query_db.bind(this), QUERY_TIMEOUT);
      });
  }
  
  /**
   * Model DB Create event: Bulk Create to supplied model
   */
  private async _event_create_query_db(): Promise<any> {
    // Reset timeout
    this._db_queue_timeout_id = null;
    
    // Copy data over to allow other processes from accessing the data
    const _entries = this._db_queue.data;
    this._db_queue.data = [];

    if (this._db_queue.model) {
      return await this._event_create_query_db_helper(_entries);
    } else {
      Log.level(1).Warning(`LocalStorage<${this._storage_name}>: No Database Model Available`);
    }

    return Promise.resolve();
  }
};