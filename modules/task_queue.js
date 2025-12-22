"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskQueue = void 0;
const bull_1 = __importDefault(require("bull"));
let dying = false;
const disconnect = (timeout, cb) => {
    debug('Disconnect queue called');
    if (!dying) {
        dying = true;
        const closers = Object.values(queues).map((q) => q.close());
        Promise.all(closers).then(() => cb(), cb);
    }
};
const PREFIX = 'shTasks';
const queues = {};
let conf;
let jobcnt = 0;
const DEBUG = process.env.DEBUG_TASK_PROCESSOR;
let debug = () => { };
if (DEBUG) {
    debug = console.debug;
}
const log = console.log;
function createQueue(name, jobOptions, advancedSettings) {
    const queue = new bull_1.default(name, {
        redis: {
            host: conf.redisHost,
            port: conf.redisPort,
            maxRetriesPerRequest: null,
            enableReadyCheck: false
        },
        prefix: PREFIX,
        defaultJobOptions: Object.assign({
            attempts: 2,
            backoff: 5000,
            lifo: true
        }, jobOptions),
        settings: Object.assign({}, advancedSettings)
    });
    queues[name] = queue;
    queue.on('error', (error) => {
        // An error occured.
        debug('QUEUE err', name, error);
    });
    queue.on('waiting', (jobId) => {
        // A Job is waiting to be processed as soon as a worker is idling.
        debug('QUEUE wait', name, jobId);
    });
    queue.on('active', (job, jobPromise) => {
        // A job has started. You can use `jobPromise.cancel()`` to abort it.
        debug('QUEUE active', name, job.id);
    });
    queue.on('stalled', (job) => {
        // A job has been marked as stalled. This is useful for debugging job
        // workers that crash or pause the event loop.
        debug('QUEUE stalled', name, job.id);
    });
    queue.on('progress', (job, progress) => {
        // A job's progress was updated!
        debug('QUEUE progress', name, job.id, progress);
    });
    queue.on('completed', (job, result) => {
        // A job successfully completed with a `result`.
        debug('QUEUE complete', name, job.id, result);
    });
    queue.on('failed', (job, err) => {
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
    queue.on('cleaned', (jobs, type) => {
        // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
        // jobs, and `type` is the type of jobs cleaned.
        debug('QUEUE cleaned', name);
    });
    queue.on('drained', () => {
        // Emitted every time the queue has processed all the waiting jobs (even if there can be some delayed jobs not yet processed)
        // debug('QUEUE drained', name);
    });
    queue.on('removed', (job) => {
        // A job successfully removed.
        debug('QUEUE removed', name, job.id);
    });
    return queue;
}
function getPrio(value) {
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
exports.taskQueue = {
    connect(config) {
        debug('connect config', config);
        conf = config;
    },
    clearQueue(queueName, status) {
        const queue = queues[queueName];
        if (queue === undefined || !queue.clean) {
            return Promise.reject('Missing queue with name: ' + queueName);
        }
        const clean = queue.clean.bind(queue, 0);
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
    queueTask(name, params, priority, jobOpts) {
        debug('Adding job', name);
        let queue = queues[name];
        if (queue === undefined || !queue.add) {
            if (conf.createIfMissing) {
                queue = createQueue(name);
            }
            else {
                return Promise.reject('Missing queue with name: ' + name);
            }
        }
        const jobid = ((params || {}).file ? params.file + (params.width || '') : new Date().toISOString()) + '_' + jobcnt++;
        params = params || {};
        const options = Object.assign({
            priority: getPrio(priority),
            jobId: jobid
        }, jobOpts);
        return queue.add(params, options);
    },
    registerTaskProcessor(name, taskProcessor, jobOptions) {
        log('Register processor', name);
        jobOptions = jobOptions || {};
        jobOptions.logStartStop = jobOptions.hasOwnProperty('logStartStop') ? jobOptions.logStartStop : true;
        const queue = createQueue(name, jobOptions);
        queue.process(async (job, done) => {
            if (jobOptions.logStartStop) {
                log('Running job: ', name, job.data.title || job.data.file);
            }
            try {
                await taskProcessor(job.data, job, done);
            }
            catch (err) {
                log('Error in task processor', name, err);
            }
        });
        return queue;
    },
    registerTaskProcessorPromise(name, taskProcessor) {
        log('Register processor with promise', name);
        const queue = createQueue(name);
        queue.process((job) => {
            debug('Running promise job', name);
            return taskProcessor(job.data, job);
        });
        return queue;
    },
    registerProcess(name, pathToProcessor, concurrency) {
        log('Register separate processor with promise', name);
        const queue = createQueue(name, {});
        concurrency = concurrency || 1;
        queue.process(concurrency, pathToProcessor);
    },
    disconnect,
    retryFailed() {
        Object.values(queues).forEach(async (queue) => {
            const jobs = await queue.getFailed(0, 1000);
            jobs.forEach((j) => {
                // TODO: add config value when to remove failed jobs
                if (j.attemptsMade > 3) {
                    j.discard();
                    debug('Discard job: ', j.id);
                }
                else {
                    j.retry();
                    debug('Restarting job: ', j.id);
                }
            });
        });
    },
    getJobCounts(qName) {
        if (queues[qName] === undefined) {
            createQueue(qName);
        }
        return (queues[qName] || {}).getJobCounts();
    },
    names() {
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
exports.default = exports.taskQueue;
//# sourceMappingURL=task_queue.js.map