import { Database, PostgresConnector } from 'https://deno.land/x/denodb/mod.ts';
import { PrecenseLogModel, UserModel, StatusModel } from './index.ts';
import { IEnvironment } from '../Interfaces/index.ts';

interface IConnectionOptions {
  sync?:  boolean,
  drop?:  boolean,
  debug?: boolean,
}
const defaultOptions: IConnectionOptions = {
  sync:   false,
  drop:   false,
  debug:  false,
};

/**
 * Initializes Database Based on Expected Envrionment Variables
 *  and optional Options
 * @param env Expected Required Environment Variables
 * @param options (Optional) Options
 */
export async function initConnection(env: IEnvironment, options = defaultOptions): Promise<Database> {
  const connection = new PostgresConnector({
    username:   env.PSQL_USER,
    password:   env.PSQL_PSWD,
    database:   env.PSQL_DB,
    host:       env.PSQL_HOST,
    port:       parseInt(env.PSQL_PORT),
  });
  const db = new Database({
    connector: connection,
    debug: options.debug,
  });
  
  // Link Models to DB
  db.link([UserModel, StatusModel, PrecenseLogModel]);

  // Sync with the Database
  if (options.sync) {
    try {
      await db.sync({ drop: options.drop })
        .then(() => console.log('DB Synced!'))
        .catch(err => console.log('Sync Error:', err));
    } catch(e) {
      return Promise.reject(e);
    }
  }
  
  // Return DB Connection
  return Promise.resolve(db);
}
