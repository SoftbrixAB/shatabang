"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const work_log_1 = __importDefault(require("../common/work_log"));
/** worker_log task stores the current status of the worker queues to a log, used to  **/
const init = function (config, task_queue) {
    const workLog = new work_log_1.default(config.cacheDir);
    task_queue.registerTaskProcessor('worker_log', async function (data, job, done) {
        const queueNames = task_queue.names();
        const now = Date.now();
        await Promise.all(queueNames.map(qName => task_queue.getJobCounts(qName)))
            .then(stats => {
            const mappedStatus = queueNames.reduce(function (result, field, index) {
                const stat = stats[index];
                result.push(compress(field, stat));
                return result;
            }, []);
            workLog.push(JSON.stringify({ t: now, s: mappedStatus }));
        });
        done();
    });
};
function compress(field, stat) {
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
function expand(cmp) {
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
exports.default = {
    init,
    compress,
    expand
};
//# sourceMappingURL=worker_log.js.map