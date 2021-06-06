
// User Model Interface
export interface IUser {
  userID:             string,
  username?:          string | null,
  disableTracking:    boolean | null,
}

// Status Model Interface
export enum StatusType {
  online, offline, dnd, idle,
}
export interface IStatus {
  statusID:   string,
  status:     StatusType,
}

// Precense Log Interface
export interface IPrecenseLog {
  precenseID: string,
  userID:     string,
  statusID:   StatusType,
  startTime:  Date,
  endTime:    Date,
}