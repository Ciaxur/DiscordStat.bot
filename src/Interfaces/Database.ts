
// User Model Interface
export interface IUser {
  userID:     string,
  username?:  string,
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
  startTime:  Date,
  endTime:    Date,
}