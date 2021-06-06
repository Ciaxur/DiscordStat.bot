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