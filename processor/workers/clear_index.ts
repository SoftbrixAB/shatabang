import * as path from 'path';
const shIndex = require('stureby-index');

interface Config {
  cacheDir: string;
}

interface TaskQueue {
  registerTaskProcessor(taskName: string, processor: (data: any, job: any, done: (err?: any) => void) => void): void;
}

const init = function(config: Config, task_queue: TaskQueue): void {
  const cacheDir = config.cacheDir;

  /*
   * data.index_name = relative path of the file from the storageDir
   */
  task_queue.registerTaskProcessor('clear_index', function(data, job, done) {
    const index_name = data.index_name;
    if (index_name === undefined || !index_name.startsWith('idx')) {
      console.log('Not an index: ' + index_name);
      done('Given parameter index_name was not an index: ' + index_name);
      return;
    }

    const idx = path.join(cacheDir, data.index_name);

    // Reinitialize the index
    const index = shIndex(idx);
    index.clear();

    if (index.keys().length === 0) {
      done();
    } else {
      done('Failed to remove index');
    }
  });
};

export default {
  init
};
