import { 
  PresenceUpdatePayload, startBot, 
  sendDirectMessage, getUser, getGuild,
  Guild,
} from 'https://deno.land/x/discordeno@10.5.0/mod.ts';
import { v4 } from 'https://deno.land/std@0.97.0/uuid/mod.ts';
import { config } from 'https://deno.land/x/dotenv@v2.0.0/mod.ts';
import { IEnvironment } from './Interfaces/index.ts';
import {
  PrecenseLogModel, UserModel,
  GuildModel, GuildActivityModel,
  BotTrackerModel,
  initConnection,
} from './Database/index.ts';
import {
  IPrecenseLog, IUser, StatusType,
  IBotTracker, IGuild,
} from './Interfaces/Database.ts';
import { Model } from 'https://deno.land/x/denodb@v1.0.24/lib/model.ts';
import { parseCommand } from './Commands/index.ts';
import { statusEnumFromString } from './Helpers/utils.ts';
import { Cache } from './Helpers/Cache.ts';

// Logging System
import Logger from './Logging/index.ts';
const Log = Logger.getInstance();

// Load in Environment Variables
Log.Print('Loading Environment Variables...');
const env: IEnvironment = config() as any;

// Database Connetion Init
Log.Print(`Initializing DB Connection to ${env.PSQL_HOST}:${env.PSQL_PORT}...`);
const db = await initConnection(env, { debug: false });
Log.Info('Database Connected!');

// Caches
const GUILD_CACHE = new Cache<IGuild>(5);
const GUILD_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 Hours


async function updateUserPrecense(user: Model, precense: PresenceUpdatePayload) {
  // Check if there is a pending Status
  const entryResult = await PrecenseLogModel
    .where('userID', user.userID as string)
    .orderBy('created_at', 'desc')
    .limit(1)
    .get();

  // Setup Status ID
  const status: StatusType = statusEnumFromString(precense.status);

  // Close off Entry
  if (entryResult.length) {
    // Update ONLY if status type is Different
    const pEntry: IPrecenseLog & Model = (entryResult as any)[0];
    const pStatusID = parseInt(pEntry.statusID as any);

    // Status Differs
    if (pEntry.endTime === null && pStatusID !== status) {
      PrecenseLogModel
        .where('precenseID', pEntry.precenseID)
        .update({ endTime: new Date().toUTCString() })
        .then(() => Log.Info(`User ${user.userID} precense log updated.`))
        .catch(err => Log.Error('User Precense\'s Endtime could not be updated.', err));
    } 
    
    // Same as Entry, no new precense to log
    else if (pEntry.endTime === null && pStatusID === status) {
      Log.Print('No new precense to log. Same as before.');
      return;
    }
  }

  // Create a new Entry
  const uuid = v4.generate().split('-').pop();
  PrecenseLogModel.create({
    precenseID: uuid,
    userID: user.userID,
    statusID: status,
    startTime: new Date().toUTCString(),
    endTime: null,
  } as any)
    .then(plog => Log.Info('Precense Log Created for ', user.userID))
    .catch(err => Log.Error('Precense Log could not be created: ', err));
}

async function checkAndNotifyBotTracking(botUser: IUser, newPresence: string) {
  Log.Internal('checkAndNotifyBotTracking', 'Notifying users of bot presence change');

  // Get tracking entries
  const tracking_entries: IBotTracker[] = await BotTrackerModel
    .where('botId', botUser.userID)
    .get() as any;
  
  // Check if Presence Changed
  const status: StatusType = statusEnumFromString(newPresence);
  const entryResult = await PrecenseLogModel
    .where('userID', botUser.userID)
    .orderBy('created_at', 'desc')
    .limit(1)
    .get();

  if (entryResult.length) {
    const pEntry: IPrecenseLog & Model = (entryResult as any)[0];
    const pStatusID = parseInt(pEntry.statusID as any);

    // Same as Entry, no new precense to log
    if (pEntry.endTime === null && pStatusID === status) {
      Log.Print('No new precense for bot. Not notifying anyone.');
      return;
    }
  }
  
  // Presence Changed, notify all
  Log.Info(`Notifying ${tracking_entries.length} users of bot ${botUser.username}[${botUser.userID}] presence change`);
  for (const entry of tracking_entries) {
    return sendDirectMessage(entry.userId, `**${botUser.username}[${botUser.userID}]**: Presence Changed to \`${newPresence}\``);
  }
}

async function addGuild(guild: Guild) {
  // Store Guild Entry
  return GuildModel.create({
    guildID: guild.id,
    guildName: guild.name,
  })
    .then(() => Log.Info(`Guild Added: ${guild.name}`))
    .catch(err => Log.Error('Guild Model Create Error: ', err));
}

// Initialize Bot
let gatewayReady = false;
startBot({
  token: env.BOT_TOKEN,
  intents: [
    'GUILDS', 'GUILD_PRESENCES', 
    'DIRECT_MESSAGES', 'GUILD_MESSAGES',
  ],
  eventHandlers: {
    ready() {
      Log.Info('Gateway is Ready!');
      gatewayReady = true;
    },

    messageCreate(msg) {
      // Handle Gateway Readiness
      if (!gatewayReady) return;
      
      const { author, content, channel } = msg;

      // Handle message only in verified channels
      if (channel?.name === 'bot-commands') {
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

                // Check Guild in Cache
                const cached_guild = GUILD_CACHE.get(msg.guildID);

                if (!cached_guild) {
                  // Make sure Guild is stored in DB
                  const guild_entry = await GuildModel.where('guildID', msg.guildID).get();
                  if (!guild_entry.length) {
                    Log.Error('Guild ID not found: ', msg.guildID);
                    const guild = await getGuild(msg.guildID);
                    GUILD_CACHE.set(msg.guildID, guild as any, GUILD_CACHE_TTL);
                    await addGuild(guild as any);
                  } else {
                    GUILD_CACHE.set(msg.guildID, cached_guild as any, GUILD_CACHE_TTL);
                  }
                }

                GuildActivityModel.create({
                  guildActivityID: uuid as string,
                  guildID: msg.guildID,
                  command: combined_cmd,
                })
                  .then(() => Log.Info(`Guild Activity Added to ${msg.guildID}: ${combined_cmd} -> ${uuid}`))
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
    },

    guildLoaded(guild) {
      Log.Info(`Guild [${guild.id}] Loaded,`, guild.name);
    },

    presenceUpdate(precense) {
      // DEBUG: Logs
      Log.Debug(`User ${precense.user.id} changed to: ${precense.status}`);
      
      // Create User if User does not Exist
      UserModel.find(precense.user.id)
        .then(async (user) => {

          // New User
          if (user === undefined) {
            // Fetch ALL Data for User
            const userPayload = await getUser(precense.user.id);
            Log.Info(`Adding ${userPayload.username}[${userPayload.id}] to Database`);
            
            // Add New Precense
            UserModel.create({
              userID: userPayload.id,
              username: userPayload.username,
              disableTracking: null,
              isBot: userPayload.bot,
            } as Partial<IUser>)
              // Update PrecenseLog
              .then(user => updateUserPrecense(user, precense))
              .catch(err => Log.Error('User Creation Error:', err));
          }

          // User in DB
          else {
            Log.Info('User Found: ', user.userID);

            // Update Username if username is null
            if (precense.user.username && user.username === null) {
              Log.Info(`Updating user ${user.userID}'s username to '${precense.user.username}'`);
              UserModel
                .where('userID', precense.user.id)
                .update({ username: precense.user.username })
                .then(() => Log.Info('Username updated'))
                .catch(err => Log.Error('Could not update username: ', err));
            }
            
            // Bot Tracking Check
            if ((user as any as IUser).isBot === true) {
              await checkAndNotifyBotTracking((user as any as IUser), precense.status);
            }
            
            // Update PrecenseLog if User has an unclosed Precense & Did not disable tracking
            if ((user as any as IUser).disableTracking !== true) {
              updateUserPrecense(user, precense);
            }
          }

        })
        .catch(err => {
          Log.Error('PresenceUpdate: Find User Error:', err);
        });
        
    }
  }
});

// Interrupt Handling: Clean up!
((Deno as any).signal((Deno as any).Signal.SIGINT) as Promise<any>)
  .then(() => {
    Log.Print('Cleaning Up...');
    Log.Print('Closing Database...');
    db.close();
    Deno.exit(0);
  });