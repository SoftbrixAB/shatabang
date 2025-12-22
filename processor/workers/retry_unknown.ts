import * as path from 'path';
const shFiles = require('../common/shatabang_files');

interface DirectoryConfig {
  import: string;
  unknown: string;
}

interface Config {
  dirs: DirectoryConfig;
}

interface TaskQueue {
  registerTaskProcessor(taskName: string, processor: (data: any, job: any, done: (err?: any) => void) => void): void;
}

/**
 * This method will move all media files in unknown directory back to the
 * import directory so they can be processed again. This could be run after an upgrade
 * with new import functionality or media support.
 */
const init = function(config: Config, task_queue: TaskQueue): void {
  const importDir = config.dirs.import;
  const unknownDir = config.dirs.unknown;

  task_queue.registerTaskProcessor('retry_unknown', function(data, job, done) {
    shFiles.listMediaFiles(unknownDir, function(err: Error | null, mediaFiles: string[]) {
      if (err) {
        console.error(err);
        return done(err);
      }

      mediaFiles.forEach(function(filePath) {
        const newPath = path.join(importDir, path.basename(filePath));
        shFiles.moveFile(filePath, newPath);
      });
      done();
    });
  });
};

export default {
  init
};
