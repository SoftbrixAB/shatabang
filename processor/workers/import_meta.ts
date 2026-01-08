import * as path from 'path';
const flatten = require('obj-flatten');
const shFiles = require('../common/shatabang_files');
const mediaInfo = require('vega-media-info');
const indexes = require("../common/indexes");

function filterKeyWords(meta: any): string[] {
  return Object.entries(flatten(meta.Raw))
    .filter(([key, val]) => key.toLowerCase().indexOf('error') < 0)
    .map(([key, val]) => val)
    .filter(val => val !== undefined && typeof (val) === 'string' && (val as string).trim().length > 0) as string[];
}

// Sometimes I find stuff on the internet that actually works =)
// This will reduce the array back to a key/value object
const backToObject = (obj: any, [k, v]: [string, any]) => ({ ...obj, [k]: v });

function extractCachableMeta(meta: any): Record<string, string> {
  return Object.entries(meta)
    .filter(([key, val]) => key !== 'Raw' && val !== undefined)
    .map(([key, val]) => {
      if (val !== undefined && typeof (val) !== 'string') {
        if (Array.isArray(val)) {
          return [key, val.join(',')];
        }
        return [key, val.toString()];
      }
      return [key, val];
    })
    // Restore back to Object
    .reduce(backToObject, {});
}

interface Config {
  storageDir: string;
  cacheDir: string;
  redisClient: any;
}

interface TaskQueue {
  registerTaskProcessor(taskName: string, processor: (data: any, job: any, done: (err?: any) => void) => void, options?: any): void;
  queueTask(taskName: string, data: any, priority?: string | number): void;
}

const init = function(config: Config, task_queue: TaskQueue): void {
  const storageDir = config.storageDir;
  const cacheDir = config.cacheDir;
  const keywordsIndex = indexes.keywordsIndex(config.redisClient);
  const metaCache = indexes.metaIndex(config.redisClient);

  task_queue.registerTaskProcessor('import_meta', function(data, job, done) {
    const sourceFilePath = path.join(storageDir, data.file);

    const id = data.id;

    mediaInfo.readMediaInfo(sourceFilePath, process.env.EXIF_TOOL).then((info: any) => {

      // Store keywords
      const filteredMeta = filterKeyWords(info);
      const cachePutPromises = filteredMeta.map(val => {
        keywordsIndex.put(val, id);
      });

      // Store meta cache
      const cachableMeta = extractCachableMeta(info);
      cachePutPromises.push(metaCache.put(id, cachableMeta));

      if (info.Thumbnail && info.Thumbnail.buffer && info.Thumbnail.buffer.length > 0) {
        const thumbnailFile = path.join(cacheDir, "120", data.file);
        shFiles.writeFile(thumbnailFile, info.Thumbnail.buffer, function(err: Error | null) {
          if (err) {
            console.error(err);
            return;
          }
        });
      } else {
        task_queue.queueTask('resize_image', { title: data.file, file: data.file, width: 120, height: 100 });
      }

      return Promise.all(cachePutPromises);
    })
      .then(() => done(), done);
  });
};

export default {
  init
};
