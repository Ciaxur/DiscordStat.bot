import { 
  startBot, getUser, getGuild,
} from 'https://deno.land/x/discordeno@11.2.0/mod.ts';
import { config } from 'https://deno.land/x/dotenv@v2.0.0/mod.ts';
import { IEnvironment } from './Interfaces/index.ts';
import { 
  UserModel, initConnection,
} from './Database/index.ts';
import { IUser, IGuild } from './Interfaces/Database.ts';
import { Cache } from './Helpers/Cache.ts';

// Actions
import { updateUserPresence } from './Actions/Presence.ts';
import { checkAndNotifyBotTracking } from './Actions/Notifications.ts';
import { handleGuildMessage } from './Actions/Messages.ts';

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
export const GUILD_CACHE = new Cache<IGuild>(5);
export const GUILD_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 Hours


// Initialize Bot
let gatewayReady = false;
startBot({
  token: env.BOT_TOKEN,
  intents: [
    'Guilds', 'GuildPresences', 
    'DirectMessages', 'GuildMessages',
  ],
  eventHandlers: {
    ready() {
      Log.Info('Gateway is Ready!');
      gatewayReady = true;
    },

    async messageCreate(msg) {
      // Handle Gateway Readiness
      if (!gatewayReady) return;

      // Message not from Server (Guild)
      if (msg.guildId === BigInt(0)) {
        Log.Info(`Message did not originate from a Guild. GuildID = ${msg.guildId}`);
        return;
      }

      // Guild Messages
      else {
        handleGuildMessage(msg)
          .catch(err => Log.Error('Uncaught Exception <handleGuildMessage>: ', err));
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
            const userPayload = await getUser(BigInt(precense.user.id));
            Log.Info(`Adding ${userPayload.username}[${userPayload.id}] to Database`);

            // Add New Precense
            UserModel.create({
              userID: userPayload.id,
              username: userPayload.username,
              disableTracking: null,
              isBot: userPayload.bot,
            } as any)
              // Update PrecenseLog
              .then(user => updateUserPresence(user, precense))
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
              updateUserPresence(user, precense);
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