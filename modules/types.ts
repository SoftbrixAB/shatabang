import { RedisClientType } from 'redis';

export interface GoogleAuthConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  allowed_ids: string[];
  userProfileURL?: string;
}

export interface DirectoryConfig {
  storage: string;
  import: string;
  upload: string;
  cache: string;
  filtered: string;
  info: string;
  deleted: string;
  duplicates: string;
  unknown: string;
}

export interface Config {
  adminHash?: string;
  serverSalt?: string;
  storageDir: string;
  cacheDir: string;
  redisHost: string;
  redisPort: number;
  baseUrl: string;
  port: number;
  googleAuth?: GoogleAuthConfig;
  redisClient?: RedisClientType;
  passport?: any;
  createIfMissing?: boolean;
  deletedDir?: string;
  uploadDir?: string;
  importDir?: string;
  dirs?: DirectoryConfig;
}
