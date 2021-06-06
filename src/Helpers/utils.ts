import { StatusType } from "../Interfaces/Database.ts";

/**
 * Helper function for determining the Enum type
 *  of a status string. Default: Online
 * @param status Status as a string
 * @returns Enum StatusType
 */
export function statusEnumFromString(status: string): StatusType {
  switch (status.toLowerCase()) {
    case 'online':
      return StatusType.online;
    case 'offline':
      return StatusType.offline;
    case 'dnd':
      return StatusType.dnd;
    case 'idle':
      return StatusType.idle;
    default:
      return StatusType.online;
  }
}

/**
 * Converts Status Type enum to string representation
 *  Default: Online
 * @param status StatusType Enum Object
 */
export function stringFromStatusEnum(status: StatusType): string {
  switch(status) {
    case StatusType.online:
      return 'online';
    case StatusType.dnd:
      return 'dnd';
    case StatusType.offline:
      return 'offline';
    case StatusType.idle:
      return 'idle';
    default:
      return 'online';
  }
}


// Clean Data Object for Time difference
export interface ITimeDifference {
  // Raw Values
  dt_ms_raw:      number,
  dt_days_raw:    number,
  dt_hours_raw:   number,
  dt_minutes_raw: number,
  dt_seconds_raw: number,

  // Rounded Values
  dt_days:        number,
  dt_hours:       number,
  dt_minutes:     number,
  dt_seconds:     number,

  // String Representation of each Difference
  dt_days_str:    string,
  dt_hours_str:   string,
  dt_minutes_str: string,
  dt_seconds_str: string,

  // Finalized Combined Result
  str: string,
}

/**
 * Construct time difference string in '1 day 2 hours 5 minutes 10 seconds'
 *  format
 * @param dt_ms Time difference in milliseconds
 */
export function getTimeDifferenceString(dt_ms: number): ITimeDifference {
  // Construct String for Time difference
  const dt_days_raw = dt_ms / (1000 * 60 * 60 * 24);
  const dt_days = Math.floor(dt_days_raw);
  const dt_days_str = dt_days !== 0
    ? `${dt_days} day${dt_days > 1 ? 's' : ''} `
    : '';

  let leftOverMs = (dt_days_raw - dt_days) * (1000 * 60 * 60 * 24);
  const dt_hours_raw = leftOverMs / (1000 * 60 * 60);
  const dt_hours = Math.floor(dt_hours_raw);
  const dt_hours_str = dt_hours !== 0
    ? `${dt_hours} hour${dt_hours > 1 ? 's' : ''} `
    : '';

  leftOverMs = (dt_hours_raw - dt_hours) * (1000 * 60 * 60);
  const dt_minutes_raw = leftOverMs / (1000 * 60);
  const dt_minutes = Math.floor(dt_minutes_raw);
  const dt_minutes_str = dt_minutes !== 0
    ? `${dt_minutes} minute${dt_minutes > 1 ? 's' : ''} `
    : '';

  leftOverMs = (dt_minutes_raw - dt_minutes) * (1000 * 60);
  const dt_seconds_raw = leftOverMs / 1000;
  const dt_seconds = Math.floor(dt_seconds_raw);
  const dt_seconds_str = dt_seconds !== 0
    ? `${dt_seconds} second${dt_seconds > 1 ? 's' : ''}`
    : '';
  
  return {
    dt_ms_raw: dt_ms,
    dt_days_raw,
    dt_hours_raw,
    dt_minutes_raw,
    dt_seconds_raw,
    dt_days,
    dt_hours,
    dt_minutes,
    dt_seconds,
    dt_days_str,
    dt_hours_str,
    dt_minutes_str,
    dt_seconds_str,
    str: dt_days_str + dt_hours_str + dt_minutes_str + dt_seconds_str,
  };
}