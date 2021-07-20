import { sendDirectMessage, CreateMessage } from 'https://deno.land/x/discordeno@12.0.1/mod.ts';
import Log from '../Logging/index.ts';

export default class AlertSystem {
  private discordUserIds: bigint[];
  private log: Log;

  /**
   * Initializes Alert System with given Array of Discord
   *  User Ids that will be alerted when triggered
   * @param ids Array of Discord User Ids
   */
  constructor(ids: string[]) {
    // Initial Instantiations
    this.discordUserIds = [];
    this.log = Log.getInstance();
    
    for (const id of ids) {
      this.discordUserIds.push(BigInt(id));
    }
  }

  /**
   * Broadcasts given Message to stored Ids
   * @param msg Message Alert to Broadcast
   */
  public async broadcastAlert(msg: CreateMessage) {
    this.log.Internal('AlertSystem.broadcastAlert', `Alerting ${this.discordUserIds.length} users`);
    
    return Promise.all(
      this.discordUserIds.map(id => sendDirectMessage(id, msg)),
    );
  }
};

/**
 * Parses Expected Alert User IDs from Environment
 * @param envValue Value from environment
 */
export function parseEnvironmentUserIds(envValue: string): string[] {
  if (envValue.trim().length === 0) {
    return [];
  }
  
  return envValue
    .split(',')
    .map(elt => elt.trim());
}