import * as Database from './Database.ts';

export { Database};

// Expected Environment Variables
export interface IEnvironment {
  BOT_TOKEN:  string,
  USER_ID:    string,
  PSQL_USER:  string,
  PSQL_PSWD:  string,
  PSQL_HOST:  string,
  PSQL_PORT:  string,
  PSQL_DB:    string,
}