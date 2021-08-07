import Logger from '../../Logging/index.ts';
const Log = Logger.getInstance();


// E = Entry | T = Data(Stored)
type StorageSetFunction<E, D> = (data: E, internalMap: Map<string, D>) => void;

export abstract class LocalStorage<E, T=E> {
  private _data: Map<string, T>;
  private _ready: boolean = false;
  private _timeout: number;

  // Internal Storage Functions
  private _store_fn: StorageSetFunction<E, T>; // The metohd in which to store data
  
  /**
   * Constructs data with optional given initialization function
   * @param initFunc (Optional) Should return a list of Entries
   * @param timeout (Optional, Default = 5000) Milliseconds to timeout trying to load data from initFunc
   *  - Timeout of -1 will infinitly retry every 1.5s
   */
  constructor(store_fn: StorageSetFunction<E, T>, initFunc?: () => Promise<E[]>, timeout = 5000) {
    this._store_fn = store_fn;
    this._data = new Map();
    this._timeout = timeout;

    if (initFunc) {
      const _fn = async () => {
        try {
          const entries = await initFunc();
          Log.Debug('LocalStorage Entries Loaded: ', entries.length);
          for (const elt of entries)
            this._store_fn(elt, this._data);
          
          this._ready = true;
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
  public async _get(key: string, model: any, storageName: string): Promise<T | null> {
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
};