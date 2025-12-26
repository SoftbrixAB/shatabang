import * as redis from 'redis';
import config from './common/config';
import * as directories from './common/directories';
import task_queue from './common/task_queue';

import clear_index from './workers/clear_index';
import create_image_finger from './workers/create_image_finger';
import import_meta from './workers/import_meta';
import resize_image from './workers/resize_image';
import retry_unknown from './workers/retry_unknown';
import run_task_in_folder from './workers/run_task_in_folder';
import update_directory_list from './workers/update_directory_list';
import update_import_directory from './workers/update_import_directory';
import upgrade_check from './workers/upgrade_check';
import worker_log from './workers/worker_log';

const processors = [
  clear_index,
  create_image_finger,
  import_meta,
  resize_image,
  retry_unknown,
  run_task_in_folder,
  update_directory_list,
  update_import_directory,
  upgrade_check,
  worker_log,
];

// Initialize the default redis client
const redisClient = redis.createClient({
  socket: {
    host: config.redisHost,
    port: config.redisPort,
    reconnectStrategy: function(retries: number) {
      if (retries > 50) {
        console.error("Retry task processor redis connection failed");
        return new Error('Redis connection retry limit exceeded');
      }
      // reconnect after
      return Math.min(retries * 4, 100) * 100;
    }
  }
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

// Connect to Redis
redisClient.connect().then(() => {
  console.log('Redis client connected');
  (config as any).redisClient = redisClient;
  task_queue.connect(config);

  directories.populatesDirectories(config);
  directories.checkDirectories(config);

  processors.forEach(function(processor) {
    processor.init(config as any, task_queue);
  });
  // The following tasks runs in a separate process
  task_queue.registerProcess('encode_video', __dirname + '/workers/encode_video');

  task_queue.queueTask('upgrade_check', {}, 'high')
    .then(async () => {
      console.log("Running task processor...");
      await task_queue.clearQueue('worker_log');
      task_queue.queueTask('worker_log');
      await task_queue.queueTask('worker_log', {}, 5, {
        repeat: {
          every: 5 * 60 * 1000
        },
        removeOnComplete: true,
        removeOnFail: true
      });
      queImport();
    }, disconnectCallback);
}).catch((err) => {
  console.error('Failed to connect to Redis:', err);
  process.exit(1);
});


function shutdown() {
  setTimeout(shutdown, 5000);
  clearTimeout(timeOut);
  task_queue.disconnect(2000, disconnectCallback);
}

async function disconnectCallback(err?: any) {
  console.log('Queue shutdown: ', err || 'OK');
  try {
    await (config as any).redisClient.quit();
  } catch (e) {
    console.error('Error closing Redis connection:', e);
  }
  process.exit(0);
}

// Ctrl-c
process.on('SIGINT', function() {
  console.error('Got SIGINT. Shuting down the queue.');
  shutdown();
});

// Kill ps
process.once('SIGTERM', function() {
  console.error('Got SIGTERM. Shuting down the queue now.');
  shutdown();
});

// Hard internal error, will exit hard after 10sec
process.on('uncaughtException', function(err) {
  console.error('Uncaught exception', err.stack);
  shutdown();
  setTimeout(disconnectCallback, 10000);
});

// Soft error, will probably be hard in the future
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  console.dir('Stack: ', (reason as any).stack);
});


let timeOut: NodeJS.Timeout = setTimeout(() => {}, 0);
const queImport = function() {
  timeOut = setTimeout(async function() {
    try {
      const job = await task_queue.queueTask('update_import_directory', {}, 'low');
      await job.finished();
    } catch (e) {
      console.error('Taskprocessor catched error', e);
    }
    queImport();
  }, 5000);
};
