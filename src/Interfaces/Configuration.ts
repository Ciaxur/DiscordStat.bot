export interface ICacheConfig {
  softCacheLimit:       number,
  hardCacheLimit?:      number,
  enableAutoScaling?:   boolean
}

export interface IConfiguration {
  version:        string,
  logging: {
    level:        number,
    logDir:       string,
  },
  cache: {
    guild:          ICacheConfig,
    userDB:         ICacheConfig,
    userDiscord:    ICacheConfig,
    presenceDelay:  ICacheConfig,
    botNotifyDelay: ICacheConfig,
    presenceDB:     ICacheConfig,
  },
  dev: {
    users:          string[],
  }
}
