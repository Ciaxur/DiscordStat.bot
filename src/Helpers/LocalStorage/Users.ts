import { IUser, IGuild, IPrecenseLog } from '../../Interfaces/Database.ts';
import { UserModel } from '../../Database/index.ts';
import { LocalStorage } from './index.ts';

// TODO: 
export default class UserLocalStorage extends LocalStorage<IUser> {
  constructor() {
    super((user, map) => map.set(user.userID, user), async () => (UserModel.get() as any));
  }
};