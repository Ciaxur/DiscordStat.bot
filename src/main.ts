import { PresenceUpdatePayload, startBot } from 'https://deno.land/x/discordeno@10.5.0/mod.ts';
import { v4 } from 'https://deno.land/std@0.97.0/uuid/mod.ts';
import { config } from 'https://deno.land/x/dotenv@v2.0.0/mod.ts';
import { IEnvironment } from './Interfaces/index.ts';
import {
  PrecenseLogModel, UserModel,
  GuildModel, GuildActivityModel,
  initConnection,
} from './Database/index.ts';
import {
  IPrecenseLog, IUser, StatusType,
} from './Interfaces/Database.ts';
import { Model } from 'https://deno.land/x/denodb@v1.0.24/lib/model.ts';
import { parseCommand } from './Commands/index.ts';
import { statusEnumFromString } from './Helpers/utils.ts';

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
          command?.execute(msg, command)
            .then(() => {   // Store Executed Command from Server
              const uuid = v4.generate().split('-').pop();
              const combined_cmd = command.cmd + (command.arguments.length
                ? ' ' + command.arguments.join(' ') : '');
                
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
              return msg.reply(`🐞 Something bad happend! Please report to Devs. Timestamp: ${Date.now()}`);
            });
        }
      }
    },

    guildLoaded(guild) {
      Log.Info('Guild Loaded,', guild.name);

      // Keep track of Connected Guilds
      GuildModel
        .find(guild.id)
        .then(entry => {
          if (!entry) {
            // Store Guild Entry
            GuildModel.create({
              guildID: guild.id,
              guildName: guild.name,
            })
              .then(() => Log.Info(`Guild Added: ${guild.name}`))
              .catch(err => Log.Error('Guild Model Create Error: ', err));
          }
        })
        .catch(err => Log.Error('Guild Loaded Fetch Error:', err));
    },

    presenceUpdate(precense) {
      // DEBUG: Logs
      Log.Debug(`User ${precense.user.id} changed to: ${precense.status}`);
      
      // Create User if User does not Exist
      UserModel.find(precense.user.id)
        .then(async (user) => {

          // New User
          if (user === undefined) {
            Log.Info(`Adding ${precense.user.id}...`);

            // Add New Precense
            UserModel.create({
              userID: precense.user.id,
              username: precense.user.username || null,
              disableTracking: null,
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