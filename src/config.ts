import Log from './Logging/index.ts';
const log = Log.getInstance();

// Project Configuration
const CONFIG_FILE = new URL('./Data/config.json', import.meta.url).pathname;
const COOLDOWN_TIME = 1000;   // 1s Cooldown

interface IConfig {
  version: string,
}
const EMPTY_CONFIG: IConfig = {
  version: "0.0.0",
}

class Configuration { // Singleton
  private static instance: Configuration;
  public config: IConfig = EMPTY_CONFIG;

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
      log.Internal('Configuration.update', 'Configuration updated');
    } catch(e) {
      log.Error('Configuration could not parse JSON config file');
    }
  }
};


export default Configuration;