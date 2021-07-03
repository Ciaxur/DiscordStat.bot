import { DataTypes, Model } from 'https://deno.land/x/denodb@v1.0.38/mod.ts';
import { ModelDefaults, ModelFields } from 'https://deno.land/x/denodb@v1.0.38/lib/model.ts';

/**
 * Guild Model
 *  Holds Data about Connected Guilds (Servers)
 */
export class GuildModel extends Model {
  static table = 'Guild';
  static timestamps = true;

  static fields = {
    guildID: {
      primaryKey: true,
      type: DataTypes.STRING,
    },
    guildName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    responseChannel: {
      type: DataTypes.STRING,
      allowNull: true,          // Default is any channel
    }
  } as ModelFields;

  static defaults = {
  } as ModelDefaults;
};