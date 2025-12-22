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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const shIndex = require('stureby-index');
const mediaInfo = require('vega-media-info');
const import_log_1 = __importDefault(require("../common/import_log"));
const MediaMeta = require('../modules/media_meta');
const file_type_regexp_1 = __importDefault(require("../modules/file_type_regexp"));
const shFiles = require('../common/shatabang_files');
const indexes = require("../common/indexes");
const directory_list_1 = __importDefault(require("../modules/directory_list"));
/**
 * This task should run every time the task processor is restarted
 */
const init = function (config, task_queue) {
    const infoDirectory = path.join(config.cacheDir, 'info');
    const storageDir = config.storageDir;
    const versionKey = 'shatabangVersion';
    const latestVersion = '202102';
    shFiles.mkdirsSync(infoDirectory);
    task_queue.registerTaskProcessor('upgrade_check', function (data, job, done) {
        function logger(...args) {
            job.log.apply(job, args);
            console.log.apply(console, args);
        }
        logger('Running upgrade to ', latestVersion);
        const redis = config.redisClient;
        // Check version in redisStore
        redis.get(versionKey, async function (err, version) {
            if (err) {
                logger('Error while retrieving versionKey', err);
                return;
            }
            if (process.env.DB_VERSION != undefined) {
                version = process.env.DB_VERSION;
                logger('Force db-version', version);
            }
            else {
                logger('Index version', version);
            }
            if (!version) {
                version = '0';
                upgrade_v1(infoDirectory, storageDir, (error) => {
                    if (error) {
                        logger(error);
                    }
                });
            }
            if (version < latestVersion) {
                const job = await task_queue.queueTask('update_directory_list');
                await job.finished();
                logger('Updated directory list');
            }
            if (version < '202014') {
                await add_import_cache(infoDirectory, storageDir, config.cacheDir);
                logger('Added import cache');
                redis.set(versionKey, '202014');
            }
            if (version < '202015') {
                await clearVemdalenIndexes(redis);
                logger('Cleared Vemdalen indexes');
                redis.set(versionKey, '202015');
            }
            if (version < '202016') {
                await clearSturebyIndexes(config.cacheDir);
                logger('Cleared stureby indexes');
                redis.set(versionKey, '202016');
            }
            if (version < '202017') {
                await import_meta_to_index(infoDirectory, storageDir, task_queue);
                logger('Queued import meta to index tasks');
                redis.set(versionKey, '202017');
            }
            if (version < '202018') {
                await reecode_videos(infoDirectory, storageDir, config.cacheDir, task_queue);
                logger('Queued reencode videos tasks');
                redis.set(versionKey, '202018');
            }
            if (version < '202102') {
                task_queue.clearQueue('upgrade_check');
                await move_v_tmp_files_to_cache(infoDirectory, storageDir, config.cacheDir);
                logger('Moved video cache files');
                const job = await task_queue.queueTask('update_directory_list');
                await job.finished();
                logger('Updated directory list');
                redis.set(versionKey, '202102');
            }
            // Clean memory
            timestamps = {};
            if (version !== latestVersion) {
                task_queue.queueTask('retry_unknown', {}, 'low');
                task_queue.retryFailed();
                logger('Successfully upgraded index to', 'v' + latestVersion);
                redis.set(versionKey, latestVersion, function () {
                    done();
                });
            }
            else {
                logger('All done');
                done();
                return;
            }
        });
    }, {
        removeOnComplete: 1,
        removeOnFail: 1
    });
};
function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
const upgrade_v1 = function (infoDirectory, storageDir, cb) {
    shFiles.listSubDirs(infoDirectory, function (error, dirs) {
        if (error) {
            return cb(error);
        }
        // Add all images to the media index with user rating 0.5
        dirs.forEach((dir) => {
            if (!isNumber(dir)) {
                return;
            }
            const yearDir = path.join(infoDirectory, dir);
            const mediaLst = fs.readFileSync(path.join(yearDir, 'media.lst'), 'utf8').split(',');
            const mediaMeta = MediaMeta(yearDir);
            mediaLst.forEach((itm) => {
                fs.stat(path.join(storageDir, itm), (err, stats) => {
                    let fileSize = -1;
                    if (err) {
                        console.log('Upgrade check error', err);
                        return;
                    }
                    fileSize = stats.size;
                    mediaMeta.set(itm, {
                        ur: 0.5,
                        s: fileSize
                    });
                });
            });
        });
        cb();
    });
};
/** Clear all indexes stored in redis **/
function clearVemdalenIndexes(redisClient) {
    return Promise.all([
        indexes.keywordsIndex(redisClient),
        indexes.metaIndex(redisClient),
        indexes.regionsIndex(redisClient)
    ].map((index) => index.clear()));
}
/* Clear all indexes stored on disk, rerun meta import */
function clearSturebyIndexes(cacheDir) {
    return Promise.all([
        indexes.fileShaIndex(cacheDir),
        indexes.imgFingerIndex(cacheDir),
        indexes.importedTimesIndex(cacheDir)
    ].map((index) => index.clear()));
}
/** Rerun all meta and image finger import **/
async function import_meta_to_index(infoDirectory, storageDir, task_queue) {
    const items = await allMedia(infoDirectory);
    for (const i in items) {
        const relativeDest = items[i];
        const timestamp = await getTimestamp(relativeDest, storageDir);
        task_queue.queueTask('import_meta', { file: relativeDest, id: '' + timestamp }, 'low');
        task_queue.queueTask('create_image_finger', { file: relativeDest }, 50);
    }
}
/* Move vhhmmss.jpg to cache so we dont clutter the sorted folder with generated files */
async function move_v_tmp_files_to_cache(infoDirectory, storageDir, cacheDir) {
    const items = await allMedia(infoDirectory);
    let cnt = 0;
    for (const i in items) {
        const relativeDest = items[i];
        const fileName = shFiles.basename(relativeDest);
        if (fileName.startsWith('v')) {
            const from = path.join(storageDir, relativeDest);
            try {
                const to = path.join(cacheDir, '1920', relativeDest);
                await shFiles.mkdirs(path.dirname(to));
                await shFiles.move(from, to, { overwrite: true });
                ++cnt;
            }
            catch (e) {
                console.log('Failed to move', relativeDest, e);
                try {
                    // Fallback and do a cleanup
                    await shFiles.deleteFile(from);
                }
                catch (ee) {
                    console.log('Failed to delete', from, ee);
                }
            }
        }
    }
    console.log('Moved', cnt, 'files');
}
// Clear import cache and add all imported media
async function add_import_cache(infoDirectory, storageDir, cacheDir) {
    const importLog = new import_log_1.default(cacheDir);
    const idxImported = indexes.importedTimesIndex(cacheDir, { flushTime: 30000 });
    try {
        await importLog.clear();
    }
    catch (e) {
        console.error('Failed to clear import log cache', e);
    }
    const items = await allMedia(infoDirectory);
    const datesTimes = new Set();
    for (const i in items) {
        const relativeDest = items[i];
        const filePath = path.join(storageDir, relativeDest);
        console.log(i, relativeDest);
        try {
            const exifData = await mediaInfo.readMediaInfo(filePath, process.env.EXIF_TOOL || true);
            const dateStr = exifData.CreateDate || exifData.ModifyDate;
            const d = new Date(dateStr).getTime();
            if (!Number.isInteger(d)) {
                console.log('Import log, date is not a number, failed to add', filePath, dateStr);
                continue;
            }
            datesTimes.add(d);
            idxImported.put(d, relativeDest);
            if (Number(i) % 500 == 0) {
                console.log('Import log: ', Math.round(10000 * (datesTimes.size / items.length)) / 100, '%');
            }
        }
        catch (e) {
            console.error('Failed to import: ', filePath, i);
        }
    }
    console.log('Import log: 100%');
    console.log('Adding to import log', datesTimes.size, 'items');
    datesTimes.forEach(d => importLog.push(d));
    importLog.close();
}
async function addImageSize(infoDirectory, task_queue, size) {
    const items = await allMedia(infoDirectory);
    for (const i in items) {
        const relativeDest = items[i];
        const data = {
            title: relativeDest,
            file: relativeDest,
        };
        task_queue.queueTask('resize_image', Object.assign(size, data), 100);
    }
}
async function reecode_videos(infoDirectory, storageDir, cacheDir, task_queue) {
    await task_queue.clearQueue('encode_video');
    await task_queue.clearQueue('resize_image');
    const items = await allMedia(infoDirectory);
    for (const i in items) {
        const relativeDest = items[i];
        const data = {
            title: relativeDest,
            file: relativeDest,
            cacheDir: cacheDir,
            storageDir: storageDir
        };
        task_queue.queueTask('resize_image', Object.assign({ width: 300, height: 200 }, data));
        task_queue.queueTask('resize_image', Object.assign({ width: 960, height: 540, keepAspec: true }, data), 1000);
        task_queue.queueTask('resize_image', Object.assign({ width: 1920, height: 1080, keepAspec: true }, data), 2000);
        if (file_type_regexp_1.default.isVideo(relativeDest)) {
            // TODO: Encode video in multiple formats and sizes, Search for faces etc.
            task_queue.queueTask('encode_video', Object.assign({ width: 1920, height: 1080 }, data), 10000);
            task_queue.queueTask('encode_video', Object.assign({ width: 960, height: 540 }, data), 5000);
        }
    }
}
async function updateMediaLists(storageDir, cacheDir) {
    const dirs = await shFiles.listSubDirsAsync(storageDir);
    return Promise.all(dirs.map((dir) => {
        if (!isNumber(dir)) {
            return Promise.resolve();
        }
        return directory_list_1.default.processDirectory(dir, storageDir, cacheDir);
    })).then(() => {
        console.log('Updated media lists');
    });
}
/** Function which returns all media files ordered in a single array with all items. */
async function allMedia(infoDirectory) {
    const dirs = await shFiles.listSubDirsAsync(infoDirectory);
    const result = [];
    // Add all images to the media index with user rating 0.5
    dirs.forEach((dir) => {
        if (!isNumber(dir)) {
            return;
        }
        const yearDir = path.join(infoDirectory, dir);
        const mediaLst = fs.readFileSync(path.join(yearDir, 'media.lst'), 'utf8').split(',');
        mediaLst.forEach((itm) => {
            result.push(itm);
        });
    });
    return result;
}
let timestamps = {};
async function getTimestamp(relativeDest, storageDir) {
    if (!timestamps[relativeDest]) {
        const filePath = path.join(storageDir, relativeDest);
        const exifData = await mediaInfo.readMediaInfo(filePath, true);
        if (exifData === undefined || (exifData.CreateDate || exifData.ModifyDate) === undefined) {
            console.log("Failed to read exif data from " + filePath);
            return undefined;
        }
        timestamps[relativeDest] = new Date(exifData.CreateDate || exifData.ModifyDate).getTime();
    }
    return timestamps[relativeDest];
}
exports.default = {
    init
};
//# sourceMappingURL=upgrade_check.js.map