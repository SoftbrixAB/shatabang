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
const shFiles = require('../common/shatabang_files');
const sort_file_1 = __importDefault(require("../modules/sort_file"));
const file_type_regexp_1 = __importDefault(require("../modules/file_type_regexp"));
const directory_list_1 = __importDefault(require("../modules/directory_list"));
const import_log_1 = __importDefault(require("../common/import_log"));
const indexes = require('../common/indexes');
const mediaInfo = require('vega-media-info');
const useExifToolFallback = process.env.EXIF_TOOL || true;
/**
 * This method will process the configured import folder and update the index,
 * thumbnail and finger for each item in the import folder.
 */
const init = function (config, task_queue) {
    const storageDir = config.storageDir;
    const importDir = config.dirs.import;
    const unknownDir = config.dirs.unknown;
    const duplicatesDir = config.dirs.duplicates;
    const importLog = new import_log_1.default(config.cacheDir);
    const idxImported = indexes.importedTimesIndex(config.cacheDir);
    task_queue.registerTaskProcessor('update_import_directory', async (data, job, done) => {
        const mediaFiles = await shFiles.listMediaFiles(importDir);
        return syncLoop(mediaFiles, async (filePath, i) => {
            job.log("Processing", i, filePath);
            const updateProgress = function () {
                job.progress(100 * i / mediaFiles.length);
            };
            try {
                const exifData = await mediaInfo.readMediaInfo(filePath, useExifToolFallback);
                if (exifData === undefined || (exifData.CreateDate || exifData.ModifyDate) === undefined) {
                    throw Error("Failed to read exif data from " + filePath);
                }
                const date = new Date(exifData.CreateDate || exifData.ModifyDate);
                const items = idxImported.get(date.getTime());
                // This needs to run synchronously. Add to cache after each update.
                if (!process.env.IGNORE_DUPLICATES && items.length > 0) {
                    const newDest = await (0, sort_file_1.default)(filePath, duplicatesDir, exifData);
                    console.log('Duplicate', filePath, newDest);
                    job.log("Exists in image date cache", newDest);
                }
                else {
                    const newDest = await (0, sort_file_1.default)(filePath, storageDir, exifData);
                    const relativeDest = path.relative(storageDir, newDest);
                    job.log('Importing', relativeDest);
                    await queueWorkers(relativeDest, date.getTime());
                    importLog.push(date.getTime());
                    idxImported.put(date.getTime(), relativeDest);
                    job.log("Imported: ", relativeDest);
                }
            }
            catch (err) {
                console.error("Failed to import", err);
                job.log("Failed to import", err);
                if (shFiles.exists(filePath)) {
                    const newPath = path.join(unknownDir, path.basename(filePath));
                    console.log('Moving to: ', newPath);
                    // Failed to import move to unknown dir
                    await shFiles.moveFile(filePath, newPath);
                }
            }
            updateProgress();
        }).then(function (importedFiles) {
            if (importedFiles > 0) {
                console.log('Files imported:', importedFiles);
            }
            done();
        }, done);
    }, { removeOnComplete: 1, removeOnFail: 5, logStartStop: false });
    const queueWorkers = function (relativeDest, timestamp) {
        task_queue.queueTask('import_meta', { title: relativeDest, file: relativeDest, id: '' + timestamp }, 1);
        const directory = relativeDest.split(path.sep)[0];
        // Thumbnail
        task_queue.queueTask('resize_image', { title: relativeDest, file: relativeDest, width: 300, height: 200 }, 2);
        task_queue.queueTask('resize_image', { title: relativeDest, file: relativeDest, width: 960, height: 540, keepAspec: true });
        task_queue.queueTask('resize_image', { title: relativeDest, file: relativeDest, width: 1920, height: 1080, keepAspec: true }, 4);
        task_queue.queueTask('create_image_finger', { title: relativeDest, file: relativeDest }, 50, { delay: 5000, backoff: 10000 });
        directory_list_1.default.addMediaListFile(directory, config.cacheDir, relativeDest);
        if (file_type_regexp_1.default.isVideo(relativeDest)) {
            // TODO: Encode video in multiple formats and sizes, Search for faces etc.
            let data = {
                title: relativeDest,
                file: relativeDest,
                cacheDir: config.cacheDir,
                storageDir: config.storageDir
            };
            data.width = 1920;
            data.height = 1080;
            task_queue.queueTask('encode_video', data, 10000);
            // Create a shallow copy
            data = Object.assign({}, data);
            data.width = 960;
            data.height = 540;
            task_queue.queueTask('encode_video', data, 5000);
        }
    };
};
function syncLoop(list, method) {
    return new Promise(function (resolve, reject) {
        if (list === undefined) {
            resolve(0);
            return;
        }
        let i = 0;
        const next = function () {
            // console.log('nextloop', i);
            if (i < list.length) {
                method(list[i], i).then(next, (e) => {
                    console.error(e);
                    next();
                });
            }
            else {
                resolve(i);
            }
            ++i;
        };
        next();
    });
}
exports.default = {
    init
};
//# sourceMappingURL=update_import_directory.js.map