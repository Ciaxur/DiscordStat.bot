
export interface ITimestamps {
  createdAt: Date,
  updatedAt: Date,
}

// User Model Interface
export interface IUser {
  userID:             string,
  username?:          string | null,
  disableTracking:    boolean | null,
  isBot:              boolean | null,
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

export interface IGuild {
  guildID:          string,
  guildName:        string,
  responseChannel:  string,   // Channel to Respond to
}

export interface IGuildActivity {
  guildActivityID:  string,
  guildID:          string,
  command:          string,
  commandArgs:      string | null,
}

export interface IBotTracker {
  trackId:    string,       // Unique ID
  botId:      string,       // Bot's ID that is being Tracked
  userId:     string,       // User's ID to notify
}