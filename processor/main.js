"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis = __importStar(require("redis"));
const config_1 = __importDefault(require("./common/config"));
const directories = __importStar(require("./common/directories"));
const task_queue = require('./common/task_queue');
const clear_index_1 = __importDefault(require("./workers/clear_index"));
const create_image_finger_1 = __importDefault(require("./workers/create_image_finger"));
const import_meta_1 = __importDefault(require("./workers/import_meta"));
const resize_image_1 = __importDefault(require("./workers/resize_image"));
const retry_unknown_1 = __importDefault(require("./workers/retry_unknown"));
const run_task_in_folder_1 = __importDefault(require("./workers/run_task_in_folder"));
const update_directory_list_1 = __importDefault(require("./workers/update_directory_list"));
const update_import_directory_1 = __importDefault(require("./workers/update_import_directory"));
const upgrade_check_1 = __importDefault(require("./workers/upgrade_check"));
const worker_log_1 = __importDefault(require("./workers/worker_log"));
const processors = [
    clear_index_1.default,
    create_image_finger_1.default,
    import_meta_1.default,
    resize_image_1.default,
    retry_unknown_1.default,
    run_task_in_folder_1.default,
    update_directory_list_1.default,
    update_import_directory_1.default,
    upgrade_check_1.default,
    worker_log_1.default,
];
// Initialize the default redis client
config_1.default.redisClient = redis.createClient({
    host: config_1.default.redisHost,
    port: config_1.default.redisPort,
    retry_strategy: function (options) {
        if (options.attempt > 50) {
            console.error("Retry task processor redis connection failed");
            return undefined; // End reconnecting with built in error
        }
        if (options.error && options.error.code === "ECONNREFUSED") {
            // End reconnecting on a specific error and flush all commands with a individual error
            console.error("The redis server refused the connection");
        }
        // reconnect after
        return Math.min(options.attempt * 4, 100) * 100;
    },
});
task_queue.connect(config_1.default);
directories.populatesDirectories(config_1.default);
directories.checkDirectories(config_1.default);
processors.forEach(function (processor) {
    processor.init(config_1.default, task_queue);
});
// The following tasks runs in a separate process
task_queue.registerProcess('encode_video', __dirname + '/workers/encode_video');
function shutdown() {
    setTimeout(shutdown, 5000);
    clearTimeout(timeOut);
    task_queue.disconnect(2000, disconnectCallback);
}
function disconnectCallback(err) {
    console.log('Queue shutdown: ', err || 'OK');
    config_1.default.redisClient.quit();
    process.exit(0);
}
// Ctrl-c
process.on('SIGINT', function () {
    console.error('Got SIGINT. Shuting down the queue.');
    shutdown();
});
// Kill ps
process.once('SIGTERM', function () {
    console.error('Got SIGTERM. Shuting down the queue now.');
    shutdown();
});
// Hard internal error, will exit hard after 10sec
process.on('uncaughtException', function (err) {
    console.error('Uncaught exception', err.stack);
    shutdown();
    setTimeout(disconnectCallback, 10000);
});
// Soft error, will probably be hard in the future
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    console.dir('Stack: ', reason.stack);
});
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
let timeOut = setTimeout(() => { }, 0);
const queImport = function () {
    timeOut = setTimeout(async function () {
        try {
            const job = await task_queue.queueTask('update_import_directory', {}, 'low');
            await job.finished();
        }
        catch (e) {
            console.error('Taskprocessor catched error', e);
        }
        queImport();
    }, 5000);
};
//# sourceMappingURL=main.js.map