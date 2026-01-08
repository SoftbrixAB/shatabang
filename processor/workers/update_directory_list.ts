import directory_list from '../modules/directory_list';

interface Config {
  cacheDir: string;
  storageDir: string;
}

interface TaskQueue {
  registerTaskProcessor(taskName: string, processor: (data: any, job: any, done: (err?: any) => void) => void): void;
}

const init = function(config: Config, task_queue: TaskQueue): void {
  const cacheDir = config.cacheDir;
  // Search the source dir so we know if the source is an image or a video
  // Drawback is that we list files which has not been processed, thus not
  // having a thumbnail
  const searchDir = config.storageDir;

  task_queue.registerTaskProcessor('update_directory_list', async function(data, _job, done) {
    if (data.dir) {
      await directory_list.processDirectory(data.dir, searchDir, cacheDir);
    } else {
      directory_list.clearMediaListFiles(cacheDir);
      await directory_list.processSubDirectories(searchDir, cacheDir);
    }
    done();
  });
};

export default {
  init
};
