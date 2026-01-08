import * as path from 'path';
import fileTypeRegexp from '../modules/file_type_regexp';
import thumbnailer from '../modules/thumbnailer';
const shFiles = require('../common/shatabang_files');
const indexes = require('../common/indexes');
const sha1File = require('sha1-file');

interface Config {
  cacheDir: string;
  storageDir: string;
}

interface TaskQueue {
  registerTaskProcessor(taskName: string, processor: (data: any, job: any, done: (err?: any) => void) => void): void;
}

const init = function(config: Config, task_queue: TaskQueue): void {
  const fileShaIndex = indexes.fileShaIndex(config.cacheDir);
  const imgFingerIndex = indexes.imgFingerIndex(config.cacheDir);

  task_queue.registerTaskProcessor('create_image_finger', function(data, job, done) {
    const sourceFile = path.join(config.storageDir, data.file);
    let sourceFingerFile = sourceFile;
    if (fileTypeRegexp.isVideo(data.file)) {
      sourceFingerFile = path.join(config.cacheDir, '1920', fileTypeRegexp.toCacheImageFileName(data.file));
    }
    if (shFiles.exists(sourceFile)) {
      Promise.all([sha1File(sourceFile), thumbnailer.create_image_finger(sourceFingerFile)])
        .then(([fileSha1, imgB85]) => {
          job.log('Adding: ', data.file, fileSha1, imgB85);
          fileShaIndex.put(fileSha1, data.file);
          imgFingerIndex.put(imgB85, data.file);
          done();
        })
        .catch((arg) => {
          job.log(arg);
          done(arg);
        });
    } else {
      done('File not found: ' + sourceFile);
    }
  });
};

export default {
  init
};
