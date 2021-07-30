/*
  Handles Message related events and utilities
*/
import { 
  getUser, getGuild,
  DiscordenoMessage, User,
} from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { v4 } from 'https://deno.land/std@0.101.0/uuid/mod.ts';

// Database & Utilities
import { GuildModel, GuildActivityModel } from '../Database/index.ts'
import { parseCommand } from '../Commands/index.ts';
import { addGuild } from '../Actions/Guild.ts';

// Shared Cache
import {
  USER_DISCORD_CACHE, USER_DISCORD_CACHE_TTL,
  GUILD_CACHE, GUILD_CACHE_TTL,
} from '../Helpers/Cache.ts';

// Logging System
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

/**
 * Handles Messages originating from a Guild (Server)
 * @param msg Message Object
 */
export async function handleGuildMessage(msg: DiscordenoMessage) {
  const { content, channel } = msg;

  // Check Cache for Author
  let author: User | null = USER_DISCORD_CACHE.get(msg.authorId.toString());

  // Fetch & Cache user
  if (!author) {
    author = await getUser(msg.authorId);
    USER_DISCORD_CACHE.set(msg.authorId.toString(), author, USER_DISCORD_CACHE_TTL);
  }

  // State of DirectMessage Guild Origin
  const isFromDirectMessage = msg.guildId === BigInt(0);
  
  // Check Guild in Cache
  let cached_guild = isFromDirectMessage ? null : GUILD_CACHE.get(msg.guildId.toString());

  if (!isFromDirectMessage) { // Don't keep track of DM Statistics
    try {
      if (!cached_guild) {
        // Make sure Guild is stored in DB
        const guild_entry = await GuildModel.where('guildID', msg.guildId.toString()).get();
        if (!guild_entry.length) {
          Log.level(3).Warning('Guild ID not found: ', msg.guildId);
          const guild = await getGuild(msg.guildId);
          GUILD_CACHE.set(msg.guildId.toString(), guild as any, GUILD_CACHE_TTL);
          await addGuild(guild as any);
          cached_guild = guild as any;
        } else {
          GUILD_CACHE.set(msg.guildId.toString(), (guild_entry as any)[0], GUILD_CACHE_TTL);
          cached_guild = (guild_entry as any)[0];
        }
      }
    } catch (err) {
      Log.Error(`Message Create Guild[${msg.guildId}] Cache Error: `, err);
      Log.ErrorDump('Message Create Guild Cache:', err, msg);
    }
  }

  // Handle message only in verified channels
  if (isFromDirectMessage || (cached_guild?.responseChannel === null || cached_guild?.responseChannel === undefined) || channel?.name === cached_guild?.responseChannel) {
    // Extract/Confirm Valid Command
    if (content.startsWith('!')) {
      Log.level(1).Info(`${author.username} issued command: ${content}`);

      const command = parseCommand(content);
      if (command) {
        // Add Additional Command Information
        command.userId = author.id;

        // Check Valid Command for DM
        if (isFromDirectMessage && command.cmdOrigin === 'SERVER') {
          msg.send('You can only use that command in a Server');
          Log.level(4).Debug(`Unusable DM-Command '${command.cmd}' used in a DM`);
          return;
        }

        command?.execute(msg, command)
          .then(async () => {   // Store Executed Command from Server
            if (isFromDirectMessage) return;
            
            const uuid = v4.generate().split('-').pop();
            const combined_cmd = command.cmd + (command.arguments.length
              ? ' ' + command.arguments.join(' ') : '');

            GuildActivityModel.create({
              guildActivityID: uuid as string,
              guildID: msg.guildId.toString(),
              command: combined_cmd,
            })
              .then(() => Log.level(3).Info(`Guild Activity Added to ${msg.guildId}: ${combined_cmd} -> ${uuid}`))
              .catch(err => {
                Log.Error('Guild Activity Error:', err);
                Log.ErrorDump('Guild Activity:', err);
              });
          })
          .catch(err => {
            const now = Date.now();
            Log.Error('Error:', err);
            Log.ErrorDump('Unknown Error:', now, err);
            
            msg.reply(`🐞 Something bad happend! Please report to Devs. Timestamp: ${now}`)
              .catch(err => {
                Log.Error('Message Reply Error:', err);
                Log.ErrorDump('Message Reply Error:', err);
              });
            return;
          });
      }
    }
  }
}