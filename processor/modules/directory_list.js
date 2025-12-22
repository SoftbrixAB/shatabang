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
const shFiles = require('../common/shatabang_files');
const path = __importStar(require("path"));
// file list is a lot of entries like '/year/month/day/time.xyz'
const fileDateRegexp = /^([\d]{2,4}).?(\d{1,2}).?(\d{1,2}).?(\d{1,6})/;
const sortFileListByDate = function (fileList) {
    return fileList.sort(function (b, a) {
        const regExpA = fileDateRegexp.exec(a) || { length: 0 };
        const regExpB = fileDateRegexp.exec(b) || { length: 0 };
        if (regExpA.length < 5 || regExpA.length !== regExpB.length) {
            return regExpA.length - regExpB.length;
        }
        if (regExpA[1] === regExpB[1]) {
            if (regExpA[2] === regExpB[2]) {
                return Number(regExpA[3]) - Number(regExpB[3]);
            }
            return Number(regExpA[2]) - Number(regExpB[2]);
        }
        return Number(regExpA[1]) - Number(regExpB[1]);
    });
};
const findMediaFiles = function (directory, sourceDir) {
    return new Promise(function (resolve, reject) {
        shFiles.listMediaFiles(path.join(sourceDir, directory), function (err, filesList) {
            if (err) {
                reject(err);
                return;
            }
            let relativeFilesList = filesList.map(function (item) {
                return path.relative(sourceDir, item);
            });
            relativeFilesList = sortFileListByDate(relativeFilesList);
            resolve(relativeFilesList);
        });
    });
};
const clearMediaListFiles = function (cacheDir) {
    const infoDirectory = path.join(cacheDir, 'info');
    shFiles.rmDirSync(infoDirectory, { recursive: true });
};
const writeMediaListFile = function (directory, cachedDir, relativeFilesList) {
    return new Promise(function (resolve, reject) {
        const mediaListFile = path.join(cachedDir, 'info', directory, 'media.lst');
        shFiles.writeFile(mediaListFile, relativeFilesList, function (err) {
            if (err) {
                reject(err);
                return;
            }
            console.log("The file was saved: ", directory);
            resolve(mediaListFile);
        });
    });
};
const addMediaListFile = function (directory, cachedDir, relativeFile) {
    return new Promise(function (resolve, reject) {
        const mediaListFile = path.join(cachedDir, 'info', directory, 'media.lst');
        if (shFiles.exists(mediaListFile)) {
            shFiles.readFile(mediaListFile, (err, fileData) => {
                if (err != undefined) {
                    reject(err);
                    return;
                }
                fileData += ',' + relativeFile;
                writeMediaListFile(directory, cachedDir, fileData)
                    .then(resolve, reject);
            });
        }
        else {
            writeMediaListFile(directory, cachedDir, relativeFile)
                .then(resolve, reject);
        }
    });
};
/**
 * Processes the year directory and put file list in cache, then generate
 * thumbnails for all items.
 */
const processDirectory = function (directory, sourceDir, cachedDir) {
    return findMediaFiles(directory, sourceDir).then(function (relativeFilesList) {
        return writeMediaListFile(directory, cachedDir, relativeFilesList.join(','));
    });
};
const processSubDirectories = function (directory, cachedDir) {
    return new Promise(function (resolve, reject) {
        shFiles.listSubDirs(directory, (err, dirs) => {
            if (err !== undefined) {
                reject(err);
            }
            const qs = dirs.map(dir => {
                return processDirectory(dir, directory, cachedDir);
            });
            Promise.all(qs).then(resolve, reject);
        });
    });
};
exports.default = {
    clearMediaListFiles,
    findMediaFiles,
    processSubDirectories,
    processDirectory,
    sortFileListByDate,
    writeMediaListFile,
    addMediaListFile
};
//# sourceMappingURL=directory_list.js.map