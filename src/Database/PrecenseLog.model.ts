import { DataTypes, Model, Relationships } from 'https://deno.land/x/denodb@v1.0.38/mod.ts';
import { ModelDefaults, ModelFields } from 'https://deno.land/x/denodb@v1.0.38/lib/model.ts';
import { UserModel } from './User.model.ts';
import { StatusModel } from './Status.model.ts';

/**
 * PrecenseLog Model
 *  Holds Data about a User's Precense
 *    on the Server at a given Timedate Range
 */
export class PrecenseLogModel extends Model {
  static table = 'PrecenseLog';
  static timestamps = true;

  static fields = {
    precenseID: {
      primaryKey: true,
      type: DataTypes.STRING,
    },
    userID: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    statusID: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    startTime: {
      type: DataTypes.DATETIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.DATETIME,
      allowNull: true,
    },
  } as ModelFields;

  static userID() {
    return this.hasOne(UserModel);
  };

  static statusIDs() {
    return this.hasOne(StatusModel);
  };

  static defaults = {
  } as ModelDefaults;
};

// Define Relationships
Relationships.belongsTo(PrecenseLogModel, UserModel, { foreignKey: 'userID' });
Relationships.belongsTo(PrecenseLogModel, StatusModel, { foreignKey: 'statusID' });