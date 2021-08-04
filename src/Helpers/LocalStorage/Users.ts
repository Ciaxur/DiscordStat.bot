import { getUser } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { IUser, IGuild, IPrecenseLog } from '../../Interfaces/Database.ts';
import { UserModel } from '../../Database/index.ts';
import { LocalStorage } from './index.ts';

// Logging
import Logging from '../../Logging/index.ts';
const Log = Logging.getInstance();

export default class UserLocalStorage extends LocalStorage<IUser> {
  constructor() {
    // super((user, map) => map.set(user.userID, user), async () => (UserModel.get() as any));
    super((user, map) => map.set(user.userID, user));
  }


  /**
   * Finds and returns given User's ID
   *  if it's available
   * @param key User's ID
   */
  public async get(key: string): Promise<IUser> {
    const _user_entry = this.data.get(key);

    // Early return
    if (_user_entry) {
      Log.level(2).Debug(`LocalStorage: User '${key}' Get found`);
      return Promise.resolve(_user_entry);
    }

    // Check Database
    try {
      const _user_db_entry = await UserModel.find(key);
      if (_user_db_entry) {
        Log.level(2).Debug(`LocalStorage: User '${key}' Get found in Database`);
        this.set(key, _user_db_entry as any);
        return Promise.resolve(_user_db_entry as any);
      }
    } catch(err) {
      Log.Error(`User LocalStorage DB.Find<user>(${key}) type(${typeof(key)}) Error: `, err);
      Log.ErrorDump(`User LocalStorage DB.Find<user>(${key}) Error: `, err);
      return Promise.reject(`User LocalStorage DB.Find<user>(${key}) Error: ${err}`);
    }

    // Not in Database, query Discord
    const _user_from_discord = await getUser(BigInt(key));
    if (_user_from_discord) {
      Log.level(2).Debug(`LocalStorage: User '${key}' Get queried from Discord`);

      const userEntry: IUser = {
        userID: _user_from_discord.id.toString(),
        username: _user_from_discord.username,
        disableTracking: null,
        isBot: _user_from_discord.bot || false,
      };
      this.set(key, userEntry);
      
      // Add user to DB
      UserModel.create(userEntry as any)
        .then(() => Log.level(1).Info(`LocalStorage: User '${_user_from_discord.username}[${key}] add to Database`))
        .catch(err => {
          Log.Error(`LocalStorage Error: User '${key}' not created: `, err);
          Log.ErrorDump(`LocalStorage Error: User not created: `, err);
        });
      return Promise.resolve(userEntry);
    }
    
    // Something's wrong here, user not found anywhere
    return Promise.reject(`User '${key}' not found on Discord, LocalStorage, nor Cache`);
  }

  /**
   * Handles storing user in the Database and/or locally
   * @param key Unique ID of user
   * @param val User data
   */
  public set(key: string, val: IUser): Promise<void> {
    this.data.set(key, val);
    return Promise.resolve();
  }
};