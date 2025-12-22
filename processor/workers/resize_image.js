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
const PREFIX = 'v';
const init = function (config, task_queue) {
    const storageDir = config.storageDir;
    const cacheDir = config.cacheDir;
    task_queue.registerTaskProcessor('resize_image', async function (data, job, done) {
        const width = data.width;
        const relativeFilePath = data.file;
        const outputImgFileName = file_type_regexp_1.default.toCacheImageFileName(path.basename(relativeFilePath));
        const outputFileName = path.join(cacheDir, '' + width, path.dirname(relativeFilePath), outputImgFileName);
        let sourceFileName = path.join(storageDir, relativeFilePath);
        if (!data.forceUpdate && shFiles.exists(outputFileName)) {
            job.log('Already exists: ' + outputFileName);
            return done();
        }
        if (file_type_regexp_1.default.isVideo(sourceFileName)) {
            const videoTmpDir = path.join(cacheDir, '1920', path.dirname(relativeFilePath));
            const tmpFileName = path.join(videoTmpDir, PREFIX + outputImgFileName);
            await shFiles.ensureDir(path.dirname(tmpFileName));
            await thumbnailer_1.default.screenshots(sourceFileName, tmpFileName, ['10%']);
            sourceFileName = tmpFileName;
        }
        else if (file_type_regexp_1.default.isHeicFile(sourceFileName)) {
            const heicTmpDir = path.join(cacheDir, '1920', path.dirname(relativeFilePath));
            const tmpFileName = path.join(heicTmpDir, 'h' + outputImgFileName);
            await shFiles.ensureDir(path.dirname(tmpFileName));
            await thumbnailer_1.default.convertHeicToJpg(sourceFileName, tmpFileName);
            sourceFileName = tmpFileName;
        }
        thumbnailer_1.default
            .generateThumbnail(sourceFileName, outputFileName, width, data.height, data.keepAspec)
            .then(() => { done(); }, done);
    });
};
exports.default = {
    init
};
//# sourceMappingURL=resize_image.js.map