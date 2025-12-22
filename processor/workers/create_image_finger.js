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
const file_type_regexp_1 = __importDefault(require("../modules/file_type_regexp"));
const thumbnailer_1 = __importDefault(require("../modules/thumbnailer"));
const shFiles = require('../common/shatabang_files');
const indexes = require('../common/indexes');
const sha1File = require('sha1-file');
const init = function (config, task_queue) {
    const fileShaIndex = indexes.fileShaIndex(config.cacheDir);
    const imgFingerIndex = indexes.imgFingerIndex(config.cacheDir);
    task_queue.registerTaskProcessor('create_image_finger', function (data, job, done) {
        const sourceFile = path.join(config.storageDir, data.file);
        let sourceFingerFile = sourceFile;
        if (file_type_regexp_1.default.isVideo(data.file)) {
            sourceFingerFile = path.join(config.cacheDir, '1920', file_type_regexp_1.default.toCacheImageFileName(data.file));
        }
        if (shFiles.exists(sourceFile)) {
            Promise.all([sha1File(sourceFile), thumbnailer_1.default.create_image_finger(sourceFingerFile)])
                .then(([fileSha1, imgB85]) => {
                job.log('Adding: ', data.file, fileSha1, imgB85);
                fileShaIndex.put(fileSha1, data.file);
                imgFingerIndex.put(imgB85, data.file);
                done();
            })
                .catch((arg) => {
                job.log(arg);
                done(arg);
            });
        }
        else {
            done('File not found: ' + sourceFile);
        }
    });
};
exports.default = {
    init
};
//# sourceMappingURL=create_image_finger.js.map