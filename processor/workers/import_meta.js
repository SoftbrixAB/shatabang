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
const path = __importStar(require("path"));
const flatten = require('obj-flatten');
const shFiles = require('../common/shatabang_files');
const mediaInfo = require('vega-media-info');
const indexes = require("../common/indexes");
function filterKeyWords(meta) {
    return Object.entries(flatten(meta.Raw))
        .filter(([key, val]) => key.toLowerCase().indexOf('error') < 0)
        .map(([key, val]) => val)
        .filter(val => val !== undefined && typeof (val) === 'string' && val.trim().length > 0);
}
// Sometimes I find stuff on the internet that actually works =)
// This will reduce the array back to a key/value object
const backToObject = (obj, [k, v]) => ({ ...obj, [k]: v });
function extractCachableMeta(meta) {
    return Object.entries(meta)
        .filter(([key, val]) => key !== 'Raw' && val !== undefined)
        .map(([key, val]) => {
        if (val !== undefined && typeof (val) !== 'string') {
            if (Array.isArray(val)) {
                return [key, val.join(',')];
            }
            return [key, val.toString()];
        }
        return [key, val];
    })
        // Restore back to Object
        .reduce(backToObject, {});
}
const init = function (config, task_queue) {
    const storageDir = config.storageDir;
    const cacheDir = config.cacheDir;
    const keywordsIndex = indexes.keywordsIndex(config.redisClient);
    const metaCache = indexes.metaIndex(config.redisClient);
    task_queue.registerTaskProcessor('import_meta', function (data, job, done) {
        const sourceFilePath = path.join(storageDir, data.file);
        const id = data.id;
        mediaInfo.readMediaInfo(sourceFilePath, process.env.EXIF_TOOL).then((info) => {
            // Store keywords
            const filteredMeta = filterKeyWords(info);
            const cachePutPromises = filteredMeta.map(val => {
                keywordsIndex.put(val, id);
            });
            // Store meta cache
            const cachableMeta = extractCachableMeta(info);
            cachePutPromises.push(metaCache.put(id, cachableMeta));
            if (info.Thumbnail && info.Thumbnail.buffer && info.Thumbnail.buffer.length > 0) {
                const thumbnailFile = path.join(cacheDir, "120", data.file);
                shFiles.writeFile(thumbnailFile, info.Thumbnail.buffer, function (err) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                });
            }
            else {
                task_queue.queueTask('resize_image', { title: data.file, file: data.file, width: 120, height: 100 });
            }
            return Promise.all(cachePutPromises);
        })
            .then(() => done(), done);
    });
};
exports.default = {
    init
};
//# sourceMappingURL=import_meta.js.map