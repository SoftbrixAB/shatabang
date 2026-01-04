import { Config } from './types';
import * as path from 'path';
import * as fs from 'fs';

/*
Transfer config values from the environment to a configuration object used by
the server and the task_processor.

The config file 'config_server.json' is used as a fallback
*/

// Find config file - support both development (modules/) and production (dist/common/) paths
function findConfigFile(): string {
  const configFileName = process.env.CONFIG_FILE || 'config_server.json';

  // Try multiple locations
  const possiblePaths = [
    path.resolve(__dirname, '..', configFileName),           // from modules/
    path.resolve(__dirname, '../..', configFileName),        // from server/dist/common/ or processor/dist/common/
    path.resolve(__dirname, '../../..', configFileName),     // additional fallback
    path.resolve(process.cwd(), configFileName),             // from current working directory
  ];

  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  throw new Error(`Config file not found. Tried: ${possiblePaths.join(', ')}`);
}

const configFilePath = findConfigFile();
const configFile = require(configFilePath);
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
if (config.googleAuth) {
  config.googleAuth.userProfileURL = config.googleAuth.userProfileURL || 'https://www.googleapis.com/oauth2/v3/userinfo';
}

export default config;
