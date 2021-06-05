import { DataTypes, Model } from 'https://deno.land/x/denodb@v1.0.24/mod.ts';
import { ModelDefaults, ModelFields } from "https://deno.land/x/denodb@v1.0.24/lib/model.ts";

/**
 * Status Model
 *  Holds the Type of Status a User is in
 */
export class StatusModel extends Model {
  static table = 'Status';

  static fields = {
    statusID: {
      primaryKey: true,
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.STRING,
      unique: true,
    }
  } as ModelFields;

  static defaults = {
  } as ModelDefaults;
};