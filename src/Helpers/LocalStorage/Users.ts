import { getUser } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { IUser } from '../../Interfaces/Database.ts';
import { UserModel } from '../../Database/index.ts';
import { LocalStorage } from './index.ts';

// Logging
import Logging from '../../Logging/index.ts';
const Log = Logging.getInstance();

export default class UserLocalStorage extends LocalStorage<IUser> {
  constructor() {
    super((user, map) => map.set(user.userID, user), async () => {
      Log.Debug('Querying Users...');
      return UserModel.get() as any;
    });
  }


  /**
   * Finds and returns given User's ID
   *  if it's available
   * @param key User's ID
   */
  public async get(key: string): Promise<IUser> {
    // Generic Check: Local & Database
    const _user_entry = await this._get(key, UserModel, 'User');
    if (_user_entry !== null) {
      return Promise.resolve(_user_entry);
    }

    // Not in Database or Local, query Discord
    const _user_from_discord = await getUser(BigInt(key));
    if (_user_from_discord) {
      Log.level(4).Debug(`LocalStorage: User '${key}' Get queried from Discord`);

      const userEntry: IUser = {
        userID: _user_from_discord.id.toString(),
        username: _user_from_discord.username,
        disableTracking: null,
        isBot: _user_from_discord.bot || false,
      };

      // Add user to DB
      this.add(key, userEntry);
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
  public add(key: string, val: IUser): Promise<void> {
    if (!this.data.has(key)) {
      this.data.set(key, val);
      UserModel.create(val as any)
        .then(() => Log.level(1).Info(`LocalStorage: User '${val.username}[${key}] add to Database`))
        .catch(err => {
          Log.level(1).Warning(`LocalStorage Error: User '${key}' not created: `, err);
        });
    }
    return Promise.resolve();
  }
};