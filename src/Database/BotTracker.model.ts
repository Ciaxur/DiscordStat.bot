import { DataTypes, Model } from 'https://deno.land/x/denodb@v1.0.24/mod.ts';
import { ModelDefaults, ModelFields } from 'https://deno.land/x/denodb@v1.0.24/lib/model.ts';

/**
 * Guild Model
 *  Holds Data about Connected Guilds (Servers)
 */
export class BotTrackerModel extends Model {
  static table = 'BotTracker';
  static timestamps = true;

  static fields = {
    trackId: {          // Unique Track ID
      primaryKey: true,
      type: DataTypes.STRING,
    },
    botId:{             // Bot's ID
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {           // User's ID to be notified
      type: DataTypes.STRING,
      allowNull: false,
    },
  } as ModelFields;

  static defaults = {
  } as ModelDefaults;
};