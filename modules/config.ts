import { Config } from './types';

/*
Transfer config values from the environment to a configuration object used by
the server and the task_processor.

The config file 'config_server.json' is used as a fallback
*/
const configFile = require('../config_server.json');
const config: Config = configFile as Config;

config.adminHash = process.env.ADMIN_HASH || config.adminHash;
config.serverSalt = process.env.SERVER_SALT || config.serverSalt;

config.storageDir = process.env.STORAGE_DIR || config.storageDir;
config.cacheDir = process.env.CACHE_DIR || config.cacheDir;

// The following configuration has hard coded default values
config.redisHost = process.env.REDIS_HOST || config.redisHost || '127.0.0.1';
config.redisPort = Number(process.env.REDIS_PORT) || config.redisPort || 6379;
config.baseUrl = process.env.BASE_URL || config.baseUrl || '/';
config.port = Number(process.env.PORT) || config.port || 3000;

// Set the correct profile URL that does not require any additional APIs
if (config.google_auth) {
  config.google_auth.userProfileURL = config.google_auth.userProfileURL || 'https://www.googleapis.com/oauth2/v3/userinfo';
}

export default config;
