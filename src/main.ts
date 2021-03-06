import { getUser, PresenceUpdatePayload, startBot } from 'https://deno.land/x/discordeno@10.2.0/mod.ts';
import { v4 } from 'https://deno.land/std@0.86.0/uuid/mod.ts';
import { config } from 'https://deno.land/x/dotenv@v2.0.0/mod.ts';
import { IEnvironment } from './Interfaces/index.ts';
import {
  PrecenseLogModel, StatusModel, UserModel,
  initConnection,
} from './Database/index.ts';
import {
  IPrecenseLog, IStatus, IUser, StatusType,
} from './Interfaces/Database.ts';
import { Model } from "https://deno.land/x/denodb@v1.0.23/lib/model.ts";

// Load in Environment Variables
console.log('Loading Environment Variables...');
const env: IEnvironment = config() as any;

// Database Connetion Init
console.log(`Initializing DB Connetion to ${env.PSQL_HOST}:${env.PSQL_PORT}...`);
const db = await initConnection(env, { debug: false });
console.log('Database Connected!');

async function updateUserPrecense(user: Model, precense: PresenceUpdatePayload) {
  // Check if there is a pending Status
  const entryResult = await PrecenseLogModel
    .where('userID', user.userID as string)
    .orderBy('created_at', 'desc')
    .limit(1)
    .get();

  // Setup Status ID
  let status: StatusType = StatusType.online;
  switch (precense.status) {
    case 'online':
      break;
    case 'offline':
      status = StatusType.offline;
      break;
    case 'dnd':
      status = StatusType.dnd;
      break;
    case 'idle':
      status = StatusType.idle;
      break;
  }

  // Close off Entry
  if (entryResult.length) {
    // Update ONLY if status type is Different
    const pEntry: IPrecenseLog & Model = (entryResult as any)[0];
    const pStatusID = parseInt(pEntry.statusID as string);

    // Status Differs
    if (pEntry.endTime === null && pStatusID !== status) {
      PrecenseLogModel
        .where('precenseID', pEntry.precenseID)
        .update({ endTime: new Date() })
        .then(() => console.log(`User ${user.userID} precense log updated.`))
        .catch(err => console.error('User Precense\'s Endtime could not be updated.', err));
    } 
    
    // Same as Entry, no new precense to log
    else if (pEntry.endTime === null && pStatusID === status) {
      console.log('No new precense to log. Same as before.');
      return;
    }
  }

  // Create a new Entry
  const uuid = v4.generate().split('-').pop();
  PrecenseLogModel.create({
    precenseID: uuid,
    userID: user.userID,
    statusID: status,
    startTime: new Date(),
    endTime: null,
  } as any)
    .then(plog => console.log('Precense Log Created for ', user.userID))
    .catch(err => console.error('Precense Log could not be created: ', err));
}

// Initialize Bot
startBot({
  token: env.BOT_TOKEN,
  intents: ['GUILDS', 'GUILD_PRESENCES'],
  eventHandlers: {
    ready() {
      console.log('Gateway is Ready!');
    },

    guildLoaded(guild) {
      console.log('Guild Loaded, ', guild.name);
    },

    presenceUpdate(precense) {
      // DEBUG: Logs
      console.log(`User ${precense.user.id} changed to: ${precense.status}`);
      
      // Create User if User does not Exist
      UserModel.find(precense.user.id)
        .then(async (user) => {

          // New User
          if (user === undefined) {
            console.log(`Adding ${precense.user.id}...`);

            // Add New Precense
            UserModel.create({
              userID: precense.user.id,
              username: precense.user.username || null,
            })
              // Update PrecenseLog
              .then(user => updateUserPrecense(user, precense))
              .catch(err => console.error('User Creation Error:', err));
          }

          // User in DB
          else {
            console.log('User Found: ', user.userID);

            // Update Username if username is null
            if (precense.user.username && user.username === null) {
              console.log(`Updating user ${user.userID}'s username to '${precense.user.username}'`);
              user.username = precense.user.username;
              user.update()
                .catch(err => console.error('Could not update username: ', err));
            }
            
            // Update PrecenseLog if User has an unclosed Precense
            updateUserPrecense(user, precense);
          }

        })
        .catch(err => {
          console.error('PresenceUpdate: Find User Error:', err);
        });
        
    }
  }
});

// Interrupt Handling: Clean up!
((Deno as any).signal((Deno as any).Signal.SIGINT) as Promise<any>)
  .then(() => {
    console.log('Cleaning Up...');
    console.log('Closing Database...');
    db.close();
    Deno.exit(0);
  });