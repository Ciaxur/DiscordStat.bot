/*
  Cache Class abstracting away Cache stale and cleanup
*/
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();


export interface ICacheData<T> {
  data: T,          // Data being Cached
  ttl: number,      // Milliseconds to keep data from going stale
  createdAt: Date,  // Date of Cache Creation
}

export class Cache<T> {
  private maxCacheSize: number;
  private enableAutoSizeScale: boolean;   // TODO: Implement me!
  private _cached_data: { [key: string]: ICacheData<T> };
  
  /**
   * Constructs a Cache instance with a set max size to cache
   *  data. Enabling Auto Size Scaling, would scale up/down
   *  the capacity in Caching data
   * @param maxSize Maximum Cache Capacity (Initially Max, if not Auto-Scale)
   * @param enableAutoSizeScale Scale up/down Cache based on frequecy
   */
  constructor(maxSize: number, enableAutoSizeScale = false) {
    this.maxCacheSize = maxSize > 0 ? maxSize : 1;
    this.enableAutoSizeScale = enableAutoSizeScale;
    this._cached_data = {};
  }

  /**
   * Attempts to get Cached entry by Key. Method handles
   *  removing stale cache
   * @param key Key of Cached Entry
   */
  public get(key: string): T | null {
    // CACHE HIT
    if (this._cached_data[key]) {
      const time_of_death = this._cached_data[key].ttl + this._cached_data[key].createdAt.getTime();
      if (time_of_death < Date.now()) {   // STALE CACHE!
        Log.Internal('Cache', `Cleared Expired Cache entry '${key}'`);
        delete this._cached_data[key];
        return null;
      }

      // REFRESH CACHE
      Log.Internal('Cache', `Cache entry refreshed '${key}'`);
      this._cached_data[key].createdAt = new Date();
      return this._cached_data[key].data;
    }

    // CACHE MISS
    return null;
  }

  /**
   * Adds/Updates entry based on Key and TTL
   * @param key Key of Entry to add
   * @param data Data to cache
   * @param ttl Cache's Time to Live
   */
  public set(key: string, data: T, ttl: number) {
    // CACHE DATA
    this._cached_data[key] = {
      data,
      ttl: ttl > 0 ? ttl : 0,
      createdAt: new Date(),
    };

    // CACHED DATA REACHED MAX, CLEAR STALE &/|| OLD CACHES
    const entries = Object.entries(this._cached_data);
    if (entries.length > this.maxCacheSize)
      this.clean_stale_old_entries(entries);
  }

  private async clean_stale_old_entries(cachedEntries: [string, ICacheData<T>][]) {
    // Clear oldest Entry & Expired Entries
    const date_now = Date.now();
    let oldestEntry = cachedEntries[0];
    const expiredKeys = [];
    for (const [key, val] of cachedEntries) {
      if (val.createdAt < oldestEntry[1].createdAt)
        oldestEntry = [key, val];
      else if (val.createdAt.getTime() + val.ttl > date_now)
        expiredKeys.push(key);
    }

    for (const key of expiredKeys) {
    Log.Internal('Cache', `Cleared Cache entry '${this._cached_data[key].data}'. Limited to ${this.maxCacheSize}`);
      delete this._cached_data[key];
    }
  }

}