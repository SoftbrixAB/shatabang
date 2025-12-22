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
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
const bodyParser = __importStar(require("body-parser"));
const task_queue = require('../common/task_queue');
const router = express.Router();
/**
 * This route manages the kue apis
 */
let cacheDir;
router.initialize = function (config) {
    cacheDir = config.cacheDir;
};
router.use('/*', bodyParser.urlencoded({ extended: true }));
const getQueueStatus = function (req, res) {
    const queueName = req.params.queue;
    let selectedNames;
    if (queueName !== undefined) {
        selectedNames = [queueName];
    }
    else {
        selectedNames = task_queue.names();
    }
    return Promise.all(selectedNames.map(qName => task_queue.getJobCounts(qName)))
        .then(stats => {
        res.end(JSON.stringify(selectedNames.reduce(function (result, field, index) {
            result[field] = stats[index];
            return result;
        }, {})));
    });
};
router.get('/status', getQueueStatus);
router.get('/status/:queue', getQueueStatus);
router.post('/add/:name/:priority/', function (req, res) {
    const id = req.params.name;
    const priority = req.params.priority;
    const params = req.body || {};
    res.end("id: " + id + ", priority: " + priority);
    task_queue.queueTask(id, params, priority);
});
router.post('/addFolder/:folder/:name/:priority/', function (req, res) {
    const id = req.params.name;
    const priority = req.params.priority;
    const params = {
        dir: req.params.folder,
        params: req.body || {},
        task_name: id,
        priority: priority
    };
    // TODO: Verify that year exists, or else return a http error
    console.log('The id: ' + id);
    res.end("id: " + id + ", priority: " + priority);
    task_queue.queueTask('run_task_in_folder', params, priority);
});
exports.default = router;
//# sourceMappingURL=queue.js.map