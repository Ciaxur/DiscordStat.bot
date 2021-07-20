import * as DatabaseInterface from './Database.ts';
import * as CommandInterface from './Command.ts';

export { DatabaseInterface, CommandInterface };

// Expected Environment Variables
export interface IEnvironment {
  ALERT_DISCORD_IDS: string,
  
  BOT_TOKEN:  string,
  PSQL_USER:  string,
  PSQL_PSWD:  string,
  PSQL_HOST:  string,
  PSQL_PORT:  string,
  PSQL_DB:    string,
}