import * as path from 'path';
const shFiles = require('../common/shatabang_files');

const PROCESS_NAME = 'run_task_in_folder';

interface Config {
  storageDir: string;
}

interface TaskQueue {
  registerTaskProcessor(taskName: string, processor: (data: any, job: any, done: (err?: any) => void) => void, options?: any): void;
  queueTask(taskName: string, data: any, priority?: string | number): void;
}

const init = function(config: Config, task_queue: TaskQueue): void {
  const storageDir = config.storageDir;

  /**
   * data.dir = dir to search for media files
   * data.params = params to the new Job
   * data.task_name = name of the new task to run
   * data.priority = priority of the new job
   */
  task_queue.registerTaskProcessor(PROCESS_NAME, function(data, job, done) {
    const searchDir = path.join(storageDir, data.dir);
    console.log(PROCESS_NAME, searchDir);
    shFiles.listMediaFiles(searchDir, function(err: Error | null, mediaFiles: string[]) {
      if (err) {
        console.error(PROCESS_NAME, err);
        return done(err);
      }
      if (mediaFiles === undefined || !mediaFiles.length) {
        return done('No files found');
      }
      mediaFiles.forEach(function(fullPath) {
        console.log(PROCESS_NAME, 'add task', data.task_name, fullPath);
        const file = path.relative(storageDir, fullPath);
        const params = data.param || {};
        params.file = file;

        task_queue.queueTask(data.task_name, params, data.priority);
      });
      done();
    });
  });
};

export default {
  init
};
