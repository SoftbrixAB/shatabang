import vemdalenIndex = require('vemdalen-index');
import shIndex = require('stureby-index');
import * as path from 'path';
import { RedisClient } from 'redis';

export const keywordsIndex = (redisClient: RedisClient): any => 
  vemdalenIndex('keywords', {
    indexType: 'strings_unique',
    client: redisClient
  });

export const metaIndex = (redisClient: RedisClient): any => 
  vemdalenIndex('meta', {
    indexType: 'object',
    client: redisClient
  });

export const regionsIndex = (redisClient: RedisClient): any => 
  vemdalenIndex('metaRegions', {
    indexType: 'object',
    client: redisClient
  });

export const fileShaIndex = (cacheDir: string): any => 
  shIndex(path.join(cacheDir, 'idx_file_sha'));

export const imgFingerIndex = (cacheDir: string): any => 
  shIndex(path.join(cacheDir, 'idx_finger'));

export const importedTimesIndex = (cacheDir: string, options?: any): any => 
  shIndex(path.join(cacheDir, 'idx_imported'), options);

export const ratingIndex = (cacheDir: string): any => 
  shIndex(path.join(cacheDir, 'idx_rating'));
