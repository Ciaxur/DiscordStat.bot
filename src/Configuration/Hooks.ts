import Config from './index.ts';
const config = Config.getInstance();

import Logger from '../Logging/index.ts';
const Log = Logger.getInstance();

import {
  GUILD_CACHE, PRESENCE_DELAY_CACHE, 
  USER_DB_CACHE, USER_DISCORD_CACHE,
} from '../Helpers/Cache.ts';


export async function initHooks() {
  Log.Internal('Configuration Hooks', 'Initalizing Configuration Hooks');
  initCacheHooks();
  initLoggingHooks();
}

async function initLoggingHooks() {
  Log.Internal('Configuration Logging Hooks', 'Initalizing Logging Configuration Hooks');

  config.on('update', () => {
    if (Log.logLevel !== config.config.logging.level) {
      Log.logLevel = config.config.logging.level;
    }
  });
}

async function initCacheHooks() {
  Log.Internal('Configuration Cache Hooks', 'Initalizing Cache Configuration Hooks');
  
  // PRESENCE CONFIG
  config.on('update', () => {
    const presense_config = config.config.cache.presenceDB;
  
    // Hard Limit changed ONLY IF auto-scaling was off
    if (presense_config.enableAutoScaling !== true && presense_config.hardCacheLimit !== undefined && presense_config.hardCacheLimit !== PRESENCE_DELAY_CACHE.hardCacheLimit) {
      PRESENCE_DELAY_CACHE.hardCacheLimit = presense_config.hardCacheLimit;
    }
  
    // Auto-Scaling Updated
    if (presense_config.enableAutoScaling !== undefined && presense_config.enableAutoScaling !== PRESENCE_DELAY_CACHE.autoSizeScaling) {
      PRESENCE_DELAY_CACHE.autoSizeScaling = presense_config.enableAutoScaling;
    }
  });

  // GUILD CONFIG
  config.on('update', () => {
    const guild_config = config.config.cache.guild;
  
    // Hard Limit changed ONLY IF auto-scaling was off
    if (guild_config.enableAutoScaling !== true && guild_config.hardCacheLimit !== undefined && guild_config.hardCacheLimit !== GUILD_CACHE.hardCacheLimit) {
      GUILD_CACHE.hardCacheLimit = guild_config.hardCacheLimit;
    }
  
    // Auto-Scaling Updated
    if (guild_config.enableAutoScaling !== undefined && guild_config.enableAutoScaling !== GUILD_CACHE.autoSizeScaling) {
      GUILD_CACHE.autoSizeScaling = guild_config.enableAutoScaling;
    }
  });

  // USERDB CONFIG
  config.on('update', () => {
    const userDB_config = config.config.cache.userDB;
  
    // Hard Limit changed ONLY IF auto-scaling was off
    if (userDB_config.enableAutoScaling !== true && userDB_config.hardCacheLimit !== undefined && userDB_config.hardCacheLimit !== USER_DB_CACHE.hardCacheLimit) {
      USER_DB_CACHE.hardCacheLimit = userDB_config.hardCacheLimit;
    }
  
    // Auto-Scaling Updated
    if (userDB_config.enableAutoScaling !== undefined && userDB_config.enableAutoScaling !== USER_DB_CACHE.autoSizeScaling) {
      USER_DB_CACHE.autoSizeScaling = userDB_config.enableAutoScaling;
    }
  });

  // USER DISCORD CONFIG
  config.on('update', () => {
    const user_discord_config = config.config.cache.userDB;
  
    // Hard Limit changed ONLY IF auto-scaling was off
    if (user_discord_config.enableAutoScaling !== true && user_discord_config.hardCacheLimit !== undefined && user_discord_config.hardCacheLimit !== USER_DISCORD_CACHE.hardCacheLimit) {
      USER_DISCORD_CACHE.hardCacheLimit = user_discord_config.hardCacheLimit;
    }
  
    // Auto-Scaling Updated
    if (user_discord_config.enableAutoScaling !== undefined && user_discord_config.enableAutoScaling !== USER_DISCORD_CACHE.autoSizeScaling) {
      USER_DISCORD_CACHE.autoSizeScaling = user_discord_config.enableAutoScaling;
    }
  });
}