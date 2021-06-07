import { DataTypes, Model, Relationships } from 'https://deno.land/x/denodb@v1.0.24/mod.ts';
import { ModelDefaults, ModelFields } from 'https://deno.land/x/denodb@v1.0.24/lib/model.ts';
import { GuildModel } from './Guild.model.ts';

/**
 * GuildActivity Model
 *  Holds Data about user interaction within
 *    a guild
 */
export class GuildActivityModel extends Model {
  static table = 'GuildActivity';
  static timestamps = true;

  static fields = {
    guildActivityID: {
      primaryKey: true,
      type: DataTypes.STRING,
    },
    guildID: {
      ...Relationships.belongsTo(GuildModel),
      type: DataTypes.STRING,
      allowNull: false,
    },
    command: {    // Raw Executed Command
      type: DataTypes.STRING,
      allowNull: false,
    },
  } as ModelFields;

  static guildIDs() {
    return this.hasMany(GuildModel);
  };

  static defaults = {
  } as ModelDefaults;
};