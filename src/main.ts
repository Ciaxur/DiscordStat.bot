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

// LocalStorage
import { UserLocalStorage } from './Helpers/LocalStorage/index.ts';
const userLocalStorage = new UserLocalStorage();


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

    guildAvailable(guild) {
      Log.Info(`Guild [${guild.id}] Available, `, guild.name);
    },

    async presenceUpdate(presence) {
      // Wait until Storage is Ready
      if (!userLocalStorage.isReady()) return;
      
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
        // Fetch User from LocalStorage
        const user = await userLocalStorage.get(presence.user.id);
        Log.level(3).Info('User Found: ', user.userID);

        // Update PrecenseLog if User has an unclosed Precense & Did not disable tracking
        if (user.disableTracking !== true) {
          updateUserPresence(user, presence)
            .catch(err => {
              Log.Error(`PresenceUpdate: User[${presence.user.id}, ${presence.user.username}] Error: `, err);
              Log.ErrorDump('PrecenseUpdate:', err, presence);
            });
        }

          // Bot Tracking Check
        if (user.isBot === true) {
          checkAndNotifyBotTracking(user, presence.status);
          }
      } catch (err) {
        Log.Error(`PresenceUpdate: User[${presence.user.id}, ${presence.user.username}] Error: `, err);
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