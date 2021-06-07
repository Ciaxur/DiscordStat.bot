import { Database, PostgresConnector } from 'https://deno.land/x/denodb@v1.0.24/mod.ts';
import { IEnvironment } from '../Interfaces/index.ts';
import { 
  PrecenseLogModel,
  UserModel, StatusModel,
  GuildModel, GuildActivityModel,
} from './index.ts';

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
  db.link([UserModel, StatusModel, PrecenseLogModel, GuildModel, GuildActivityModel]);

  // Sync with the Database
  if (options.sync) {
    try {
      await db.sync({ drop: options.drop })
        .then(() => {
          console.log('DB Synced!');
          StatusModel.create([
            { statusID: 0, status: 'online' },
            { statusID: 1, status: 'offline' },
            { statusID: 2, status: 'dnd' },
            { statusID: 3, status: 'idle' },
          ])
            .then(() => console.log('Status Items Created'))
            .catch(err => console.log('Failed to created Status Entries:', err));
          
        })
        .catch(err => console.log('Sync Error:', err));
    } catch(e) {
      return Promise.reject(e);
    }
  }
  
  // Return DB Connection
  return Promise.resolve(db);
}
