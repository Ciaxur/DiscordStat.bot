import { LocalStorage } from './LocalStorage.ts';
import UserLocalStorage from './Users.ts';
import GuildLocalStorage from './Guild.ts';

// Shared LocalStorage Instances
const userLocalStorage_instance = new UserLocalStorage();
const guildLocalStorage_instance = new GuildLocalStorage();

export {
  LocalStorage,
  UserLocalStorage,
  GuildLocalStorage,
  userLocalStorage_instance,
  guildLocalStorage_instance,
}