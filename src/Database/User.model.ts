import { DataTypes, Model } from 'https://deno.land/x/denodb/mod.ts';
import { ModelDefaults, ModelFields } from "https://deno.land/x/denodb@v1.0.23/lib/model.ts";
import { PrecenseLogModel } from "./PercenseLog.model.ts";

/**
 * User Model
 *  Holds Data about their Discord ID
 *    and Discord Username
 */
export class UserModel extends Model {
  static table = 'User';
  static timestamps = true;

  static fields = {
    userID: {
      primaryKey: true,
      type: DataTypes.STRING,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  } as ModelFields;

  static precenseLogs() {
    return this.hasMany(PrecenseLogModel);
  }

  static defaults = {
  } as ModelDefaults;
};