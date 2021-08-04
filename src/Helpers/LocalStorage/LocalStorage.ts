import Logger from '../../Logging/index.ts';
const Log = Logger.getInstance();


type StorageSetFunction<T> = (data: T, internalMap: Map<string, T>) => void;

export abstract class LocalStorage<T> {
  private _data: Map<string, T>;
  private _ready: boolean = false;
  private _timeout: number;

  // Internal Storage Functions
  private _store_fn: StorageSetFunction<T>; // The metohd in which to store data
  
  /**
   * Constructs data with optional given initialization function
   * @param initFunc (Optional) Should return a list of Entries
   * @param timeout (Optional, Default = 5000) Milliseconds to timeout trying to load data from initFunc
   *  - Timeout of -1 will infinitly retry every 1.5s
   */
  constructor(store_fn: StorageSetFunction<T>, initFunc?: () => Promise<T[]>, timeout = 5000) {
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
   * Finds and returns the value associated with given key  
   *  if it's available
   * @param key Unique key retrieving data for
   */
  public abstract get(key: string): Promise<T>;

  /**
   * Handles storing given key-value pairs
   * @param key Unique key for data
   */
  public abstract add(key: string, val: T): Promise<void>;
};