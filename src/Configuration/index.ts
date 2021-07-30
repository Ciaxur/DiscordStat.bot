import { IConfiguration } from '../Interfaces/Configuration.ts';
import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

// Project Configuration
const CONFIG_FILE = new URL('../config.json', import.meta.url).pathname;
const COOLDOWN_TIME = 1000;   // 1s Cooldown


const EMPTY_CONFIG: IConfiguration = {
  version: "0.0.0",
  logging: {
    level: 1,
    logDir: "logs"
  },
  cache: {
    guild: {
      softCacheLimit: 5,
    },
    presenceDB: {
      softCacheLimit: 5,
    },
    userDB: {
      softCacheLimit: 5,
    },
    userDiscord: {
      softCacheLimit: 5,
    },
  }
}

type ConfigurationHooks = 'update';

class Configuration { // Singleton
  private static instance: Configuration;
  public config: IConfiguration = EMPTY_CONFIG;

  // HOOKS
  private updateHooks: (() => void)[] = [];
  

  private constructor () {
    this.update();
    this.startWatcher();
  }

  /**
   * Watches for Config file changes and updates as
   *  required
   */
  private async startWatcher() {
    // Start Watcher
    const watcher = Deno.watchFs(CONFIG_FILE);
    let lastRan = Date.now();
    for await (const event of watcher) {
      const now = Date.now();
      
      if (event.kind === 'modify') {
        if (now - lastRan < COOLDOWN_TIME) continue;
        lastRan = now;
        this.update();
      }
    }
  }

  /**
   * Runs hooks to notify configuration was modified
   */
  private async notifyUpdateHooks() {
    this.updateHooks.forEach(fn => fn());
  }
  
  /**
   * Creates (if not avialable) and returns the instance
   * @returns Configuration Instance
   */
  public static getInstance() {
    if (!Configuration.instance) {
      Configuration.instance = new Configuration();
    }
    return Configuration.instance;
  }

  /**
   * Updates the current configuration from config file
   */
  public update() {
    try {
      this.config = JSON.parse(Deno.readTextFileSync(CONFIG_FILE));
      Log.Internal('Configuration.update', 'Configuration updated');

      this.notifyUpdateHooks();
    } catch(e) {
      Log.Error('Configuration could not parse JSON config file', e);
    }
  }

  /**
   * Adds an event hook
   * @param eventType Type of event to add hook to
   */
  public on(eventType: ConfigurationHooks, hookFn: () => void): void {
    Log.Internal('Configuration.on', `Add hook to event ${eventType}`);
    switch(eventType) {
      case 'update':
        this.updateHooks.push(hookFn);
        break;
    }
  }
};


export default Configuration;