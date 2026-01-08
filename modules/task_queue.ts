import Queue, { Job, JobOptions, Queue as BullQueue } from 'bull';
import { Config } from './types';

let dying = false;

const disconnect = (timeout: number, cb: (err?: any) => void): void => {
  debug('Disconnect queue called');
  if (!dying) {
    dying = true;
    const closers = Object.values(queues).map((q) => q.close());
    Promise.all(closers).then(() => cb(), cb);
  }
};

const PREFIX = 'shTasks';
const queues: Record<string, BullQueue> = {};
let conf: Config;
let jobcnt = 0;
const DEBUG = process.env.DEBUG_TASK_PROCESSOR;

let debug: (...args: any[]) => void = () => {};
if (DEBUG) {
  debug = console.debug;
}
const log = console.log;

function createQueue(name: string, jobOptions?: any, advancedSettings?: any): BullQueue {
  const queue = new Queue(name, {
    redis: {
      host: conf.redisHost,
      port: conf.redisPort,
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    },
    prefix: PREFIX,
    defaultJobOptions: Object.assign(
      {
        attempts: 2,
        backoff: 5000,
        lifo: true
      },
      jobOptions
    ),
    settings: Object.assign({}, advancedSettings)
  });

  queues[name] = queue;

  queue.on('error', (error: Error) => {
    // An error occured.
    debug('QUEUE err', name, error);
  });

  queue.on('waiting', (jobId: string) => {
    // A Job is waiting to be processed as soon as a worker is idling.
    debug('QUEUE wait', name, jobId);
  });

  queue.on('active', (job: Job, jobPromise: any) => {
    // A job has started. You can use `jobPromise.cancel()`` to abort it.
    debug('QUEUE active', name, job.id);
  });

  queue.on('stalled', (job: Job) => {
    // A job has been marked as stalled. This is useful for debugging job
    // workers that crash or pause the event loop.
    debug('QUEUE stalled', name, job.id);
  });

  queue.on('progress', (job: Job, progress: any) => {
    // A job's progress was updated!
    debug('QUEUE progress', name, job.id, progress);
  });

  queue.on('completed', (job: Job, result: any) => {
    // A job successfully completed with a `result`.
    debug('QUEUE complete', name, job.id, result);
  });

  queue.on('failed', (job: Job, err: Error) => {
    // A job failed with reason `err`!
    debug('QUEUE failed', name, job.id, err);
  });

  queue.on('paused', () => {
    // The queue has been paused.
    debug('QUEUE paused', name);
  });

  queue.on('resumed', () => {
    // The queue has been resumed.
    debug('QUEUE resumed', name);
  });

  queue.on('cleaned', (jobs: Job[], type: string) => {
    // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
    // jobs, and `type` is the type of jobs cleaned.
    debug('QUEUE cleaned', name);
  });

  queue.on('drained', () => {
    // Emitted every time the queue has processed all the waiting jobs (even if there can be some delayed jobs not yet processed)
    // debug('QUEUE drained', name);
  });

  queue.on('removed', (job: Job) => {
    // A job successfully removed.
    debug('QUEUE removed', name, job.id);
  });

  return queue;
}

function getPrio(value: any): number | undefined {
  if (value === undefined || Number.isSafeInteger(value)) {
    return value;
  }
  switch (value) {
    case 'low':
      return 100;
    case 'high':
      return 1;
    default:
      return 50;
  }
}

type TaskProcessor = (data: any, job: Job, done: Queue.DoneCallback) => void | Promise<void>;
type TaskProcessorPromise = (data: any, job: Job) => Promise<any>;

interface TaskQueueModule {
  connect(config: Config): void;
  clearQueue(queueName: string, status?: string): Promise<void>;
  queueTask(name: string, params?: any, priority?: string | number, jobOpts?: JobOptions): Promise<Job>;
  registerTaskProcessor(name: string, taskProcessor: TaskProcessor, jobOptions?: any): BullQueue;
  registerTaskProcessorPromise(name: string, taskProcessor: TaskProcessorPromise): BullQueue;
  registerProcess(name: string, pathToProcessor: string, concurrency?: number): void;
  disconnect: typeof disconnect;
  retryFailed(): void;
  getJobCounts(qName: string): Promise<any>;
  names(): string[];
  prefix: string;
}

export const taskQueue: TaskQueueModule = {
  connect(config: Config): void {
    debug('connect config', config);
    conf = config;
  },

  clearQueue(queueName: string, status?: string): Promise<void> {
    const queue = queues[queueName];
    if (queue === undefined || !(queue as any).clean) {
      return Promise.reject('Missing queue with name: ' + queueName);
    }
    const clean = (queue as any).clean.bind(queue, 0);

    if (status !== undefined) {
      return queue
        .pause()
        .then(() => clean(status))
        .then(() => {
          queue.resume();
        });
    }

    return queue
      .pause()
      .then(() => clean('completed'))
      .then(() => clean('active'))
      .then(() => clean('delayed'))
      .then(() => clean('failed'))
      .then(() => {
        return queue.empty();
      })
      .then(() => {
        return queue.getRepeatableJobs();
      })
      .then((repeatJobs) => {
        repeatJobs.forEach((job) => {
          queue.removeRepeatableByKey(job.key);
        });
      })
      .then(() => {
        queue.resume();
      });
  },

  queueTask(name: string, params?: any, priority?: string | number, jobOpts?: JobOptions): Promise<Job> {
    debug('Adding job', name);
    let queue = queues[name];
    if (queue === undefined || !queue.add) {
      if (conf.createIfMissing) {
        queue = createQueue(name);
      } else {
        return Promise.reject('Missing queue with name: ' + name);
      }
    }

    const jobid =
      ((params || {}).file ? params.file + (params.width || '') : new Date().toISOString()) + '_' + jobcnt++;
    params = params || {};
    const options = Object.assign(
      {
        priority: getPrio(priority),
        jobId: jobid
      },
      jobOpts
    );
    return queue.add(params, options);
  },

  registerTaskProcessor(name: string, taskProcessor: TaskProcessor, jobOptions?: any): BullQueue {
    log('Register processor', name);
    jobOptions = jobOptions || {};
    jobOptions.logStartStop = jobOptions.hasOwnProperty('logStartStop') ? jobOptions.logStartStop : true;
    const queue = createQueue(name, jobOptions);
    queue.process(async (job: Job, done: Queue.DoneCallback) => {
      if (jobOptions.logStartStop) {
        log('Running job: ', name, job.data.title || job.data.file);
      }
      try {
        await taskProcessor(job.data, job, done);
      } catch (err) {
        log('Error in task processor', name, err);
      }
    });

    return queue;
  },

  registerTaskProcessorPromise(name: string, taskProcessor: TaskProcessorPromise): BullQueue {
    log('Register processor with promise', name);
    const queue = createQueue(name);

    queue.process((job: Job) => {
      debug('Running promise job', name);
      return taskProcessor(job.data, job);
    });

    return queue;
  },

  registerProcess(name: string, pathToProcessor: string, concurrency?: number): void {
    log('Register separate processor with promise', name);
    const queue = createQueue(name, {});

    concurrency = concurrency || 1;
    queue.process(concurrency, pathToProcessor);
  },

  disconnect,

  retryFailed(): void {
    Object.values(queues).forEach(async (queue) => {
      const jobs = await queue.getFailed(0, 1000);
      jobs.forEach((j) => {
        // TODO: add config value when to remove failed jobs
        if (j.attemptsMade > 3) {
          j.discard();
          debug('Discard job: ', j.id);
        } else {
          j.retry();
          debug('Restarting job: ', j.id);
        }
      });
    });
  },

  getJobCounts(qName: string): Promise<any> {
    if (queues[qName] === undefined) {
      createQueue(qName);
    }
    return (queues[qName] || ({} as any)).getJobCounts();
  },

  names(): string[] {
    return [
      'clear_index',
      'create_image_finger',
      'encode_video',
      'import_meta',
      'resize_image',
      'retry_unknown',
      'run_task_in_folder',
      'update_directory_list',
      'upgrade_check',
      // Keep the update import loop on the side
      'update_import_directory'
    ];
  },

  prefix: PREFIX
};

export default taskQueue;
