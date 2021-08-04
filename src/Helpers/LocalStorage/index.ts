import { LocalStorage } from './LocalStorage.ts';
import UserLocalStorage from './Users.ts';

// Shared LocalStorage Instances
const userLocalStorage_instance = new UserLocalStorage();

export {
  LocalStorage,
  UserLocalStorage,
  userLocalStorage_instance,
}