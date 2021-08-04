import { getGuild } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { IGuild } from '../../Interfaces/Database.ts';
import { GuildModel } from '../../Database/index.ts';
import { addGuild } from '../../Actions/Guild.ts';
import { LocalStorage } from './index.ts';

// Logging
import Logging from '../../Logging/index.ts';
const Log = Logging.getInstance();
import { DataTypes, Model } from 'https://deno.land/x/denodb@v1.0.38/mod.ts';

export default class GuildLocalStorage extends LocalStorage<IGuild> {
  constructor() {
    super((guild, map) => map.set(guild.guildID, guild), async () => (GuildModel.get() as any));
  }


  /**
   * Finds and returns given Guild's ID
   *  if it's available
   * @param key Guild's ID
   */
  public async get(key: string): Promise<IGuild> {
    // Generic Check: Local & Database
    const _guild_entry = await this._get(key, GuildModel, 'Guild');
    if (_guild_entry !== null) {
      return Promise.resolve(_guild_entry);
    }

    // Not in Database or Local, query Discord
    const _guild_from_discord = await getGuild(BigInt(key));
    if (_guild_from_discord) {
      Log.level(2).Debug(`LocalStorage: Guild '${key}' Get queried from Discord`);

      const guildEntry: IGuild = {
        guildID: _guild_from_discord.id.toString(),
        guildName: _guild_from_discord.name,
        responseChannel: null,
      };
      
      return this.add(key, guildEntry)
        .then(() => guildEntry);
    }
    
    // Something's wrong here, guild not found anywhere
    return Promise.reject(`Guild '${key}' not found on Discord, LocalStorage, nor Cache`);
  }

  /**
   * Handles storing guild in the Database and/or locally
   * @param key Unique ID of guild
   * @param val Guild data
   */
  public add(key: string, val: IGuild): Promise<void> {
    if (!this.data.has(key)) {
      this.data.set(key, val);
      return getGuild(BigInt(key))
        .then(guild => addGuild(guild));
    }
    return Promise.resolve();
  }

  /**
   * Handles updating guild in the Database and/or locally
   * @param key Unique ID of guild
   * @param val Updated Guild data
   */
  public update(key: string, val: Partial<IGuild>): Promise<void> {
    const _entry = this.data.get(key);
    if (_entry) {
      const newData = {
        ..._entry,
        ...val,
      };
      
      // Update Data
      this.data.set(key, newData);
      return GuildModel
        .where('guildID', key)
        .update(newData)
        .then(() => Promise.resolve())
        .catch(err => Promise.reject(err));
    } {
      return Promise.reject('Guild LocalStorage Update: Error, entry does not exist');
    }
  }

};