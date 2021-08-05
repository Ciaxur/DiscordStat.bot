import { LocalStorage } from './LocalStorage.ts';
import UserLocalStorage from './Users.ts';
import GuildLocalStorage from './Guild.ts';
import BotNotificationLocalStorage from './BotNotification.ts';

// Shared LocalStorage Instances
const userLocalStorage_instance = new UserLocalStorage();
const guildLocalStorage_instance = new GuildLocalStorage();
const botNotificationLocalStorage_instance = new BotNotificationLocalStorage();

Deno.writeTextFileSync('bot-data.json', JSON.stringify(botNotificationLocalStorage_instance.data));

export {
  LocalStorage,
  UserLocalStorage,
  GuildLocalStorage,
  BotNotificationLocalStorage,
  userLocalStorage_instance,
  guildLocalStorage_instance,
  botNotificationLocalStorage_instance,
}