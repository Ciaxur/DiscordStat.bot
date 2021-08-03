import { startBot, getUser, botId } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import { config } from 'https://deno.land/x/dotenv@v2.0.0/mod.ts';
import { IEnvironment } from './Interfaces/index.ts';
import { 
  UserModel, initConnection,
} from './Database/index.ts';
import { IUser } from './Interfaces/Database.ts';

// Actions
import { updateUserPresence } from './Actions/Presence.ts';
import { checkAndNotifyBotTracking } from './Actions/Notifications.ts';
import { handleGuildMessage } from './Actions/Messages.ts';

// Logging System
import Logger from './Logging/index.ts';
const Log = Logger.getInstance();

// Log setup from Configuration
import Configuration from './Configuration/index.ts';
Log.logLevel = Configuration.getInstance().config.logging.level;
Log.log_dir_path = Configuration.getInstance().config.logging.logDir;

// Load in Environment Variables
Log.Print('Loading Environment Variables...');
const env: IEnvironment = config() as any;

// Setup Alert System for Discord User IDs
import AlertSystem, { parseEnvironmentUserIds } from './Actions/Alert.ts';
const parsed = parseEnvironmentUserIds(env.ALERT_DISCORD_IDS);
const alertSystem = new AlertSystem(parsed);
console.log('Alert Discord IDs Parsed:', parsed);

Log.addMessageHook(err => {    // Setup Log Message Hook
  alertSystem.broadcastAlert({
    embeds: [{
      title: 'Alert System Broadcast',
      description: err,
      footer: {
        text: `Timestamp: ${Date.now()}`,
      },
    }],
  })
    .catch(err => Log.Error(err));
}, 'error');

// Setup Configuration Hooks
import { initHooks } from './Configuration/Hooks.ts';
initHooks();

// Database Connection Init
Log.Print(`Initializing DB Connection to ${env.PSQL_HOST}:${env.PSQL_PORT}...`);
let db_checked_ping = false;
const db = await initConnection(env, { debug: false });
Log.Info('Database Connected!');

// Cache
import { USER_DB_CACHE, USER_DB_CACHE_TTL } from './Helpers/Cache.ts';


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

    messageCreate(msg) {
      // Handle Gateway Readiness or Message from Self
      if (!gatewayReady || msg.authorId === botId) return;

      // Message not from Server (Guild)
      if (msg.guildId === BigInt(0)) {
        Log.level(2).Info(`Message did not originate from a Guild. GuildID = ${msg.guildId}`);
      }

      handleGuildMessage(msg)
        .catch(err => {
          const errorMsg = `Uncaught Exception <handleGuildMessage>: ${msg.guild?.name}[${msg.guildId}] from ${msg.authorId}`;
          Log.Error(errorMsg, err);
          Log.ErrorDump(errorMsg, err, msg);
        });
    },

    guildLoaded(guild) {
      Log.Info(`Guild [${guild.id}] Loaded,`, guild.name);
    },

    async presenceUpdate(presence) {
      // DEBUG: Logs
      Log.level(2).Debug(`User ${presence.user.id} changed to: ${presence.status}`);
      
      // Try to ping DB & avoid filling up query buffer
      try {
        const db_pingged = await db.ping();
        if (!db_pingged && !db_checked_ping) {
          Log.Error('Database: No Ping:', db_pingged);
          db_checked_ping = true;
          return;
        }

        // Ping Successful
        db_checked_ping = false;
      } catch(e) {
        // Notify only Once
        if (!db_checked_ping) {
          Log.Error('Database: Ping Error:', e);
          db_checked_ping = true;
        }
        return;
      }
      
      // Handle Presence Update
      try {
        // Check Cache
        let user = USER_DB_CACHE.get(presence.user.id.toString());

        // Cache Miss
        if (!user) {
          user = await UserModel.find(presence.user.id.toString()) as any;

          // Store in Cache
          if (user)
            USER_DB_CACHE.set(user.userID.toString(), user, USER_DB_CACHE_TTL);
        }

        // New User
        if (!user) {
          // Fetch ALL Data for User
          const userPayload = await getUser(BigInt(presence.user.id));
          Log.level(1).Info(`Adding ${userPayload.username}[${userPayload.id}] to Database`);

          // Add New Precense
          UserModel.create({
            userID: userPayload.id,
            username: userPayload.username,
            disableTracking: null,
            isBot: userPayload.bot,
          } as any)
            // Update PrecenseLog
            .then(user => updateUserPresence(user as any, presence))
            .catch(err => {
              Log.Error(`User Creation Error: Precese Status[${presence.status}],`, err);
              Log.ErrorDump('Precense Update User Creation Error:', err, presence);
            });
        }

        // User found
        else {
          Log.level(3).Info('User Found: ', user.userID);

          // Update Username if username is null
          if (presence.user.username && user.username === null) {
            Log.level(3).Info(`Updating user ${user.userID}'s username to '${presence.user.username}'`);
            UserModel
              .where('userID', presence.user.id)
              .update({ username: presence.user.username })
              .then(() => Log.level(3).Info('Username updated'))
              .catch(err => Log.Error('Could not update username: ', err));
          }

          // Bot Tracking Check
          if ((user as any as IUser).isBot === true) {
            checkAndNotifyBotTracking((user as any as IUser), presence.status);
          }

          // Update PrecenseLog if User has an unclosed Precense & Did not disable tracking
          if ((user as any as IUser).disableTracking !== true) {
            updateUserPresence(user as any, presence);
          }
        }

      } catch (err) {
        Log.Error(`PresenceUpdate: Find User[${presence.user.id}, ${presence.user.username}] Error: `, err);
        Log.ErrorDump('PrecenseUpdate:', err, presence);
      }
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