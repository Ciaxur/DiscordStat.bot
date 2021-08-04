/*
  Handles Message related events and utilities
*/
import { DiscordenoMessage } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { v4 } from 'https://deno.land/std@0.101.0/uuid/mod.ts';

// Database & Utilities
import { GuildActivityModel } from '../Database/index.ts'
import { parseCommand } from '../Commands/index.ts';

// LocalStorage
import { 
  userLocalStorage_instance,
  guildLocalStorage_instance,
} from '../Helpers/LocalStorage/index.ts';

// Logging System
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

/**
 * Handles Messages originating from a Guild (Server)
 * @param msg Message Object
 */
export async function handleGuildMessage(msg: DiscordenoMessage) {
  const { content, channel } = msg;

  // Get author from LocalStorage
  const author = await userLocalStorage_instance.get(msg.authorId.toString());

  // State of DirectMessage Guild Origin
  const isFromDirectMessage = msg.guildId === BigInt(0);
  
  // Get guild if not from DM
  const guild = isFromDirectMessage ? null : await guildLocalStorage_instance.get(msg.guildId.toString());

  // Handle message only in verified channels
  if (isFromDirectMessage || (guild?.responseChannel === null || guild?.responseChannel === undefined) || channel?.name === guild?.responseChannel) {
    // Extract/Confirm Valid Command
    if (content.startsWith('!')) {
      Log.level(1).Info(`${author.username} issued command: ${content}`);

      const command = parseCommand(content);
      if (command) {
        // Add Additional Command Information
        command.userId = author.userID;

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

            GuildActivityModel.create({
              guildActivityID: uuid as string,
              guildID: msg.guildId.toString(),
              command: command.cmd,
              commandArgs: command.arguments.length
                ? command.arguments.join(' ')
                : null,
            })
              .then(() => Log.level(3).Info(`Guild Activity Added to ${msg.guildId}: ${command.cmd} -> ${uuid}`))
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