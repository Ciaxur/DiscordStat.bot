/*
  Handles Message related events and utilities
*/
import { 
  getUser, getGuild,
  DiscordenoMessage,
} from 'https://deno.land/x/discordeno@11.2.0/mod.ts';
import { v4 } from 'https://deno.land/std@0.100.0/uuid/mod.ts';
import { GUILD_CACHE, GUILD_CACHE_TTL } from '../main.ts';

// Database & Utilities
import { GuildModel, GuildActivityModel } from '../Database/index.ts'
import { parseCommand } from '../Commands/index.ts';
import { addGuild } from '../Actions/Guild.ts';

// Logging System
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

/**
 * Handles Messages originating from a Guild (Server)
 * @param msg Message Object
 */
export async function handleGuildMessage(msg: DiscordenoMessage) {
  const { content, channel } = msg;
  const author = await getUser(msg.authorId);     // TODO: Cache me!

  // Check Guild in Cache
  let cached_guild = GUILD_CACHE.get(msg.guildId.toString());

  try {
    if (!cached_guild) {
      // Make sure Guild is stored in DB
      const guild_entry = await GuildModel.where('guildID', msg.guildId.toString()).get();
      if (!guild_entry.length) {
        Log.Error('Guild ID not found: ', msg.guildId);
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
    Log.Error('Message Create Guild Cache Error: ', err);
  }

  // Handle message only in verified channels
  if (cached_guild?.responseChannel === null || channel?.name === cached_guild?.responseChannel) {
    // Extract/Confirm Valid Command
    if (content.startsWith('!')) {
      Log.Info(`${author.username} issued command: ${content}`);

      const command = parseCommand(content);
      if (command) {
        // Add Additional Command Information
        command.userId = author.id;

        command?.execute(msg, command)
          .then(async () => {   // Store Executed Command from Server
            const uuid = v4.generate().split('-').pop();
            const combined_cmd = command.cmd + (command.arguments.length
              ? ' ' + command.arguments.join(' ') : '');

            GuildActivityModel.create({
              guildActivityID: uuid as string,
              guildID: msg.guildId.toString(),
              command: combined_cmd,
            })
              .then(() => Log.Info(`Guild Activity Added to ${msg.guildId}: ${combined_cmd} -> ${uuid}`))
              .catch(err => Log.Error('Guild Activity Error:', err));
          })
          .catch(err => {
            Log.Error('Error:', err);
            msg.reply(`🐞 Something bad happend! Please report to Devs. Timestamp: ${Date.now()}`)
              .catch(err => Log.Error('Message Reply Error:', err));
            return;
          });
      }
    }
  }
}