/*
  Cache Class abstracting away Cache stale and cleanup
*/
import { User } from "https://deno.land/x/discordeno@12.0.1/src/types/users/user.ts";
import { IUser, IGuild } from '../Interfaces/Database.ts';
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();


export interface ICacheData<T> {
  data: T,          // Data being Cached
  ttl: number,      // Milliseconds to keep data from going stale
  createdAt: Date,  // Date of Cache Creation
}

export class Cache<T> {
  // DYNAMIC-SCALING
  private _maxCacheSize: number;
  private enableAutoSizeScale: boolean;
  private softCacheLimit: number;
  private hardCacheLimit: number;
  private lastCachedItem: ICacheData<T> | null = null;
  
  private _cached_data: { [key: string]: ICacheData<T> };
  
  /**
   * Constructs a Cache instance with a set max size to cache
   *  data. Enabling Auto Size Scaling, would scale up/down
   *  the capacity in Caching data
   * @param softLimit At LEAST Capacity (Initially Max, if not Auto-Scale)
   * @param hardLimit At MOST Capacity (Default: Set same as Soft Limit)
   * @param enableAutoSizeScale Scale up/down Cache based on frequecy
   */
  constructor(softLimit: number, hardLimit = -1, enableAutoSizeScale = false) {
    this.softCacheLimit = softLimit > 0 ? softLimit : 1;
    this.hardCacheLimit = this.softCacheLimit;
    this._maxCacheSize = hardLimit !== -1 ? hardLimit : this.softCacheLimit;
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
    const cached_item = {
      data,
      ttl: ttl > 0 ? ttl : 0,
      createdAt: new Date(),
    };
    this._cached_data[key] = cached_item;

    // CACHED DATA REACHED MAX, CLEAR STALE &/|| OLD CACHES
    let entries = Object.entries(this._cached_data);

    if (entries.length > this.hardCacheLimit) {
      // CLEAN UP
      this.clean_stale_old_entries(entries);
    }

    // AUTO-SCALE?
    entries = Object.entries(this._cached_data);  // Re-count
    if (this.enableAutoSizeScale)
      this.determine_autoscale(key, entries.length);

    // TRACK LAST CACHED
    this.lastCachedItem = cached_item;
  }

  /**
   * Sets the TTL on a given key IF available
   * @param key Data's key to set TTL of
   * @param ttl Tile to live
   */
  public expire(key: string, ttl: number) {
    if (this._cached_data[key]) {
      Log.Internal('Cache.expire', `Setting '${key}''s ttl to ${ttl}`);
      this._cached_data[key].ttl = ttl;
    }
  }

  private async clean_stale_old_entries(cachedEntries: [string, ICacheData<T>][]) {
    // Clear oldest Entry & Expired Entries
    const date_now = Date.now();
    let oldestEntry = cachedEntries[0];
    const expiredKeys = [];
    for (const [key, val] of cachedEntries) {
      if (val.createdAt < oldestEntry[1].createdAt)     // Store Oldest Entry
        oldestEntry = [key, val];
      if (val.createdAt.getTime() + val.ttl < date_now) // Store Expired Entries
        expiredKeys.push(key);
    }

    for (const key of expiredKeys) {
      Log.Internal('Cache', `Cleared Cache entry '${key}'. Limited to ${this.hardCacheLimit}`);
      delete this._cached_data[key];
    }
  }

  /**
   * Determines if auto-scaling of Cache should be applied
   *  in terms of scaling up or down
   * @param key Key of latest Entry
   * @param cache_size Current Cache Size
   */
  private determine_autoscale(key: string, cache_size: number) {
    // AUTO-SCALING
    //  [SCALE UP] last item Cached was NOT 75% of the way through TTL,
    //   then apply scaling
    if (cache_size > this.hardCacheLimit && this.lastCachedItem && this.lastCachedItem.createdAt.getTime() + this.lastCachedItem.ttl >= (Date.now() + (this.lastCachedItem.ttl * 0.75))) {
      // 1.5x current cache capacity
      const newCacheHardLimit = Math.floor(this.hardCacheLimit * 1.5);
      this.hardCacheLimit = newCacheHardLimit > this._maxCacheSize 
        ? this._maxCacheSize
        : newCacheHardLimit;
      
      Log.Internal('Cache_AutoScale_UP', `Increased Hard-limit to ${this.hardCacheLimit}`);
        
      // keep track of last item cached
      this.lastCachedItem = this._cached_data[key];
    }
    
    // [SCALE DOWN] 
    else if (this.hardCacheLimit > this.softCacheLimit && this.lastCachedItem && cache_size < this.hardCacheLimit) {
      // Decrease size by 75%
      let newCacheHardLimit = Math.floor(cache_size * 0.75);

      // Constrain to current minimum Cache size
      newCacheHardLimit = newCacheHardLimit < this.softCacheLimit
        ? this.softCacheLimit
        : newCacheHardLimit;

      // Contrain to current Cache Size, not losing Data!
      this.hardCacheLimit = newCacheHardLimit < cache_size
        ? cache_size
        : newCacheHardLimit;
      
      Log.Internal('Cache_AutoScale_DOWN', `Decreased Hard-limit to ${this.hardCacheLimit}`);
    }
  }

}


// SHARED CACHE OBJECTS
export const GUILD_CACHE = new Cache<IGuild>(5);
export const GUILD_CACHE_TTL = 24 * 60 * 60 * 1000;         // 24 Hours

// cache from db
export const USER_DB_CACHE = new Cache<IUser>(100);
export const USER_DB_CACHE_TTL  = 10 * 60 * 1000;           // 10 Minutes

// cache from Discord API
export const USER_DISCORD_CACHE = new Cache<User>(100);
export const USER_DISCORD_CACHE_TTL  = 10 * 60 * 1000;      // 10 Minutes
