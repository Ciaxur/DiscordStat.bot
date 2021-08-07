import { Database, PostgresConnector } from 'https://deno.land/x/denodb@v1.0.38/mod.ts';
import { PostgresClient } from 'https://deno.land/x/denodb@v1.0.38/deps.ts';
import { IEnvironment } from '../Interfaces/index.ts';
import { 
  PrecenseLogModel,
  UserModel, StatusModel,
  GuildModel, GuildActivityModel,
  BotTrackerModel,
} from './index.ts';
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

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


export abstract class DatabaseConnection {
  private static _db: Database | null;
  private static _client: PostgresClient | null;
  

  /**
   * Initializes Database Based on Expected Envrionment Variables
   *  and optional Options
   * @param env Expected Required Environment Variables
   * @param options (Optional) Options
   */
  public static async initConnection(env: IEnvironment, options = defaultOptions): Promise<Database> {
    const connection = new PostgresConnector({
      username: env.PSQL_USER,
      password: env.PSQL_PSWD,
      database: env.PSQL_DB,
      host: env.PSQL_HOST,
      port: parseInt(env.PSQL_PORT),
    });
    const db = new Database({
      connector: connection,
      debug: options.debug,
    });


    // Link Models to DB
    db.link([UserModel, StatusModel, PrecenseLogModel, GuildModel, GuildActivityModel, BotTrackerModel]);

    // Sync with the Database
    if (options.sync) {
      try {
        await db.sync({ drop: options.drop })
          .then(() => {
            Log.Internal('initConnection', 'DB Synced!');
            StatusModel.create([
              { statusID: 0, status: 'online' },
              { statusID: 1, status: 'offline' },
              { statusID: 2, status: 'dnd' },
              { statusID: 3, status: 'idle' },
            ])
              .then(() => Log.Internal('initConnection', 'Status Items Created'))
              .catch(err => Log.Error('Init Connection, Failed to created Status Entries:', err));

          })
          .catch(err => Log.Error('Sync Error:', err));
      } catch (e) {
        return Promise.reject(e);
      }
    }

    // Store internal data
    DatabaseConnection._db = db;
    DatabaseConnection._client = connection._client;
    
    // Return DB Connection
    return Promise.resolve(db);
  }

  /**
   * @returns Established Database Connection
   */
  public static getDatabaseInstance(): Database | null {
    return DatabaseConnection._db;
  }

  /**
   * @returns Established Database Connection's Client
   */
  public static getClientInstance(): PostgresClient | null {
    return DatabaseConnection._client;
  }
};
