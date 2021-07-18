/*
  Handles Guild State changes, database additions, and other Guild
    related utilities
*/
import { Guild } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { GuildModel } from '../Database/index.ts';

// Logging System
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

/**
 * Adds a given Guild object to the Database
 * @param guild Guild Object to be added as an entry
 */
export async function addGuild(guild: Guild) {
  // Store Guild Entry
  return GuildModel.create({
    guildID: guild.id,
    guildName: guild.name,
    responseChannel: null,
  })
    .then(() => Log.Info(`Guild Added: ${guild.name}`))
    .catch(err => Log.Error('Guild Model Create Error: ', err));
}