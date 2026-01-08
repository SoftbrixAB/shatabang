import * as _ from 'underscore';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_FILE_NAME = 'media.meta';

interface MediaMetaInstance {
  getAll(): Promise<Record<string, any>>;
  get(key: string): Promise<any>;
  getKeys(): Promise<string[]>;
  set(key: string, meta: any): Promise<any>;
  delete(key: string): Promise<any>;
}

const _instance = function(cacheDirectory: string, fileName?: string): MediaMetaInstance {
  fileName = fileName || DEFAULT_FILE_NAME;
  const metaFilePath = path.join(cacheDirectory, fileName);
  let _objs: Record<string, any> | undefined;
  let _readDeferred: Promise<Record<string, any>> | undefined;

  const _flush = function() {
    fs.writeFile(metaFilePath, JSON.stringify(_objs), (err) => {
      if (err) {
        console.log(err);
      }
    });
  };
  const _throttledFlush = _.throttle(_flush, 1000);

  return {
    // Read multiple
    getAll(): Promise<Record<string, any>> {
      if (!_.isUndefined(_objs)) {
        return Promise.resolve(_objs);
      }
      if (!_.isUndefined(_readDeferred)) {
        return _readDeferred;
      }

      _readDeferred = new Promise(function(resolve, reject) {
        fs.readFile(metaFilePath, (err, data) => {
          if (err) {
            // ENOENT = File is missing
            if (err.code !== 'ENOENT') {
              reject(err);
              return;
            }
          }
          if (_.isUndefined(data)) {
            // No file found, initialize empty object
            _objs = {};
          } else {
            _objs = JSON.parse(data.toString());
            if (!_.isObject(_objs)) {
              reject('Stored type is not an object');
              return;
            }
          }
          resolve(_objs!);
        });
      });
      return _readDeferred;
    },

    // Read single
    get(key: string): Promise<any> {
      return this.getAll().then((objs) => {
        return objs[key];
      });
    },

    // Read index
    getKeys(): Promise<string[]> {
      return this.getAll().then((objs) => {
        return _.keys(objs);
      });
    },

    // Create / update
    set(key: string, meta: any): Promise<any> {
      return this.getAll().then((objs) => {
        objs[key] = meta;
        _throttledFlush();
        return meta;
      });
    },

    // Delete
    delete(key: string): Promise<any> {
      return this.getAll().then((objs) => {
        const val = objs[key];
        delete objs[key];
        _throttledFlush();
        return val;
      });
    }
  };
};

const _instanceCache: Record<string, MediaMetaInstance> = {};

export default function(cacheDirectory: string): MediaMetaInstance {
  // This will keep a lot in memory but will reuse the instances in the same
  // process thus enable multiple read and writes from different parts of the application.
  if (_.isUndefined(_instanceCache[cacheDirectory])) {
    _instanceCache[cacheDirectory] = _instance(cacheDirectory);
    // TODO: Add support to unload an instance from the cache.
  }
  return _instanceCache[cacheDirectory];
}
