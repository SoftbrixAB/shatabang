import * as path from 'path';
const shFiles = require('../common/shatabang_files');
import sort_file from '../modules/sort_file';
import fileMatcher from '../modules/file_type_regexp';
import directory_list from '../modules/directory_list';
import ImportLog from '../common/import_log';
const indexes = require('../common/indexes');
const mediaInfo = require('vega-media-info');

const useExifToolFallback = process.env.EXIF_TOOL || true;

interface DirectoryConfig {
  import: string;
  unknown: string;
  duplicates: string;
}

interface Config {
  storageDir: string;
  cacheDir: string;
  dirs: DirectoryConfig;
}

interface TaskQueue {
  registerTaskProcessor(taskName: string, processor: (data: any, job: any, done: (err?: any) => void) => Promise<void>, options?: any): void;
  queueTask(taskName: string, data: any, priority?: string | number, options?: any): void;
}

/**
 * This method will process the configured import folder and update the index,
 * thumbnail and finger for each item in the import folder.
 */
const init = function(config: Config, task_queue: TaskQueue): void {
  const storageDir = config.storageDir;
  const importDir = config.dirs.import;
  const unknownDir = config.dirs.unknown;
  const duplicatesDir = config.dirs.duplicates;

  const importLog = new ImportLog(config.cacheDir);
  const idxImported = indexes.importedTimesIndex(config.cacheDir);

  task_queue.registerTaskProcessor('update_import_directory', async (data, job, done) => {
    const mediaFiles = await shFiles.listMediaFiles(importDir);

    return syncLoop(mediaFiles, async (filePath: string, i: number) => {
      job.log("Processing", i, filePath);

      const updateProgress = function() {
        job.progress(100 * i / mediaFiles.length);
      };

      try {
        const exifData = await mediaInfo.readMediaInfo(filePath, useExifToolFallback);
        if (exifData === undefined || (exifData.CreateDate || exifData.ModifyDate) === undefined) {
          throw Error("Failed to read exif data from " + filePath);
        }
        const date = new Date(exifData.CreateDate || exifData.ModifyDate);
        const items = idxImported.get(date.getTime());
        // This needs to run synchronously. Add to cache after each update.
        if (!process.env.IGNORE_DUPLICATES && items.length > 0) {
          const newDest = await sort_file(filePath, duplicatesDir, exifData);
          console.log('Duplicate', filePath, newDest);
          job.log("Exists in image date cache", newDest);
        } else {
          const newDest = await sort_file(filePath, storageDir, exifData);
          const relativeDest = path.relative(storageDir, newDest);
          job.log('Importing', relativeDest);
          await queueWorkers(relativeDest, date.getTime());
          importLog.push(date.getTime());
          idxImported.put(date.getTime(), relativeDest);
          job.log("Imported: ", relativeDest);
        }
      } catch (err) {
        console.error("Failed to import", err);
        job.log("Failed to import", err);
        if (shFiles.exists(filePath)) {
          const newPath = path.join(unknownDir, path.basename(filePath));
          console.log('Moving to: ', newPath);
          // Failed to import move to unknown dir
          await shFiles.moveFile(filePath, newPath);
        }
      }
      updateProgress();
    }).then(function(importedFiles) {
      if (importedFiles > 0) {
        console.log('Files imported:', importedFiles);
      }
      done();
    }, done);
  }, { removeOnComplete: 1, removeOnFail: 5, logStartStop: false });

  const queueWorkers = function(relativeDest: string, timestamp: number): void {
    task_queue.queueTask('import_meta', { title: relativeDest, file: relativeDest, id: '' + timestamp }, 1);

    const directory = relativeDest.split(path.sep)[0];

    // Thumbnail
    task_queue.queueTask('resize_image', { title: relativeDest, file: relativeDest, width: 300, height: 200 }, 2);
    task_queue.queueTask('resize_image', { title: relativeDest, file: relativeDest, width: 960, height: 540, keepAspec: true });
    task_queue.queueTask('resize_image', { title: relativeDest, file: relativeDest, width: 1920, height: 1080, keepAspec: true }, 4);
    task_queue.queueTask('create_image_finger', { title: relativeDest, file: relativeDest }, 50, { delay: 5000, backoff: 10000 });

    directory_list.addMediaListFile(directory, config.cacheDir, relativeDest);

    if (fileMatcher.isVideo(relativeDest)) {
      // TODO: Encode video in multiple formats and sizes, Search for faces etc.
      let data: any = {
        title: relativeDest,
        file: relativeDest,
        cacheDir: config.cacheDir,
        storageDir: config.storageDir
      };
      data.width = 1920;
      data.height = 1080;
      task_queue.queueTask('encode_video', data, 10000);

      // Create a shallow copy
      data = Object.assign({}, data);
      data.width = 960;
      data.height = 540;
      task_queue.queueTask('encode_video', data, 5000);
    }
  };
};

function syncLoop(list: any[] | undefined, method: (item: any, index: number) => Promise<void>): Promise<number> {
  return new Promise(function(resolve, reject) {
    if (list === undefined) {
      resolve(0);
      return;
    }
    let i = 0;
    const next = function() {
      // console.log('nextloop', i);
      if (i < list.length) {
        method(list[i], i).then(next, (e) => {
          console.error(e);
          next();
        });
      } else {
        resolve(i);
      }
      ++i;
    };
    next();
  });
}

export default {
  init
};
