import { ITimeDifference } from '../Helpers/utils.ts';

// SIMPLE UPTIME CACHE
interface IUptimeCache {
  [userID: string]: {
    weekUptime: {
      startDate: Date,
      endDate: Date,
      week_dt: ITimeDifference,
    }
    timestamp: Date,    // Time when Cached
  }
}
export const UPTIME_CACHE: IUptimeCache = {};
export const UPTIME_CACHE_EXPIRE = 1 * 60 * 1000;   // 1 Minute


/**
 * Keeps cache constrained to a given size limit
 * @param cache Cache to constrain
 * @param entriesLimit Limit of cached entries
 */
export async function restrictUptimeCache(cache: IUptimeCache, entriesLimit: number) {
  const cachedEntries = Object.entries(cache);

  // Early return, no need to do anything. Size has not been reached
  if (cachedEntries.length < entriesLimit || entriesLimit < 1) return;

  let oldestEntry = cachedEntries[0];
  for (const [key, val] of cachedEntries) {
    if (val.timestamp < oldestEntry[1].timestamp)
      oldestEntry = [key, val];
  }
  console.log(`Cleared Cache entry '${oldestEntry[0]}'. Limited to ${entriesLimit}`);
  delete cache[oldestEntry[0]];
}