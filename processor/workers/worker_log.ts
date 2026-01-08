import WorkLog from '../common/work_log';

interface Config {
  cacheDir: string;
}

interface JobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface CompressedStat {
  n: string;
  w: number;
  a: number;
  c: number;
  f: number;
  d: number;
  p: number;
}

interface TaskQueue {
  registerTaskProcessor(taskName: string, processor: (data: any, job: any, done: (err?: any) => void) => void | Promise<void>, options?: any): void;
  names(): string[];
  getJobCounts(queueName: string): Promise<JobCounts>;
}

/** worker_log task stores the current status of the worker queues to a log, used to  **/
const init = function(config: Config, task_queue: TaskQueue): void {
  const workLog = new WorkLog(config.cacheDir);

  task_queue.registerTaskProcessor('worker_log', async function(data, job, done) {
    const queueNames = task_queue.names();
    const now = Date.now();

    await Promise.all(queueNames.map(qName => task_queue.getJobCounts(qName)))
      .then(stats => {
        const mappedStatus = queueNames.reduce(function(result: CompressedStat[], field, index) {
          const stat = stats[index];
          result.push(compress(field, stat));
          return result;
        }, []);
        workLog.push(JSON.stringify({ t: now, s: mappedStatus }));
      });
    done();
  });
};

function compress(field: string, stat: JobCounts): CompressedStat {
  return {
    n: field,
    w: stat.waiting,
    a: stat.active,
    c: stat.completed,
    f: stat.failed,
    d: stat.delayed,
    p: stat.paused,
  };
}

function expand(cmp: CompressedStat): JobCounts & { name: string } {
  return {
    name: cmp.n,
    waiting: cmp.w,
    active: cmp.a,
    completed: cmp.c,
    failed: cmp.f,
    delayed: cmp.d,
    paused: cmp.p,
  };
}

export default {
  init,
  compress,
  expand
};
