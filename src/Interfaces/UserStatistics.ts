interface DateRange {
  start: Date,
  end?: Date,
}

export interface UserStat {
  // Null means done tracking | Otherwise, user is still online
  onlineRange: DateRange | null,
  
  // Log of Fullfilled Online/Offline Ranges
  precenseLog: DateRange[],
}