import { LocalStorage } from './LocalStorage.ts';
import UserLocalStorage from './Users.ts';
import GuildLocalStorage from './Guild.ts';
import BotNotificationLocalStorage from './BotNotification.ts';
import PresenceLocalStorage from './Presense.ts'

// Shared LocalStorage Instances
const userLocalStorage_instance = new UserLocalStorage();
const guildLocalStorage_instance = new GuildLocalStorage();
const botNotificationLocalStorage_instance = new BotNotificationLocalStorage();
const presenceLocalStorage_instance = new PresenceLocalStorage();

export {
  LocalStorage,
  UserLocalStorage,
  GuildLocalStorage,
  BotNotificationLocalStorage,
  PresenceLocalStorage,
  
  userLocalStorage_instance,
  guildLocalStorage_instance,
  botNotificationLocalStorage_instance,
  presenceLocalStorage_instance,
}