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
exports.deleteFile = exports.copyFile = exports.copy = exports.moveFile = exports.move = exports.rename = exports.exists = exports.mkdirsSync = exports.mkdirs = exports.rmDirSync = exports.readFile = exports.writeFile = exports.listSubDirPaths = exports.listSubDirsAsync = exports.listSubDirs = exports.listMediaFiles = exports.ensureDir = exports.extname = exports.diname = exports.basename = void 0;
const dir = __importStar(require("node-dir"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs-extra"));
const fileEditFallback = (fileHandlingMethod, source, newDestination, resolve, reject) => {
    const command = `${fileHandlingMethod} "${source}" "${newDestination}"`;
    return (error) => {
        if (error) {
            // Cross device move
            if (error.code === 'EXDEV') {
                (0, child_process_1.exec)(command, (error) => {
                    if (error) {
                        console.log(command, error);
                        reject(error);
                    }
                    else {
                        resolve(newDestination, source);
                    }
                });
            }
            else {
                console.error('Move error', error);
                reject(error);
            }
        }
        else {
            resolve(newDestination, source);
        }
    };
};
const findAvaliableFileName = (destination, retryCnt = 0) => {
    let newDestination = destination;
    if (retryCnt > 0) {
        const fileInfo = path.parse(destination);
        fileInfo.name = fileInfo.name + '_' + retryCnt;
        fileInfo.base = fileInfo.name + fileInfo.ext;
        newDestination = path.format(fileInfo);
    }
    return new Promise((resolve, reject) => {
        fs.access(newDestination, fs.constants.F_OK, (err) => {
            if (!err) {
                findAvaliableFileName(destination, (retryCnt || 0) + 1).then((name) => resolve(name), (error) => reject(error));
            }
            else {
                resolve(newDestination);
            }
        });
    });
};
exports.basename = path.basename;
exports.diname = path.dirname;
exports.extname = path.extname;
exports.ensureDir = fs.ensureDir;
const listMediaFiles = (sourceDir, callback) => {
    return new Promise((resolve, reject) => {
        if (callback === undefined) {
            callback = (err, result) => {
                if (err !== undefined) {
                    reject(err);
                }
                resolve(result);
            };
        }
        dir.files(sourceDir, (err, files) => {
            if (err) {
                callback(err);
                return;
            }
            if (files === undefined) {
                callback('Directory not found');
                return;
            }
            const mediaFiles = /^(?!\.).+([mj]pe?g|png|mp4|m4a|m4v|mov|bmp|avi|heic)$/i;
            const filteredFiles = files.filter((item) => mediaFiles.test(path.basename(item)));
            callback(undefined, filteredFiles);
        });
    });
};
exports.listMediaFiles = listMediaFiles;
/**
 * Only list the direct sub directories
 */
const listSubDirs = (sourceDir, callback) => {
    callback(undefined, fs.readdirSync(sourceDir).filter((file) => {
        return fs.statSync(path.join(sourceDir, file)).isDirectory();
    }));
};
exports.listSubDirs = listSubDirs;
const listSubDirsAsync = async (sourceDir) => {
    return new Promise((resolve) => {
        (0, exports.listSubDirs)(sourceDir, (_ignore, dirs) => resolve(dirs));
    });
};
exports.listSubDirsAsync = listSubDirsAsync;
// List all subdir paths
const listSubDirPaths = (sourceDir, callback) => {
    dir.subdirs(sourceDir, callback);
};
exports.listSubDirPaths = listSubDirPaths;
/**
 * The write file method will first create the folder for the file to be in
 */
const writeFile = (filePath, fileContent, callback) => {
    fs.mkdirs(path.dirname(filePath), (error) => {
        if (error) {
            console.log(filePath, 'Error: ' + error.message);
        }
        fs.writeFile(filePath, fileContent, callback);
    });
};
exports.writeFile = writeFile;
exports.readFile = fs.readFile;
exports.rmDirSync = fs.rmdirSync;
exports.mkdirs = fs.mkdirs;
exports.mkdirsSync = fs.mkdirsSync;
const exists = (filePath) => {
    try {
        fs.statSync(filePath);
        return true;
    }
    catch (e) {
        return false;
    }
};
exports.exists = exists;
exports.rename = fs.rename;
exports.move = fs.move;
const moveFile = (source, destination) => {
    return new Promise((resolve, reject) => {
        findAvaliableFileName(destination).then((newDestination) => {
            fs.rename(source, newDestination, fileEditFallback("mv", source, newDestination, resolve, reject));
            return newDestination;
        });
    });
};
exports.moveFile = moveFile;
exports.copy = fs.copy;
const copyFile = (source, destination) => {
    return new Promise((resolve, reject) => {
        findAvaliableFileName(destination).then((newDestination) => {
            fs.copy(source, newDestination, fileEditFallback("mv", source, newDestination, resolve, reject));
        });
    });
};
exports.copyFile = copyFile;
const deleteFile = (source) => {
    return new Promise((resolve, reject) => {
        fs.unlink(source, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
};
exports.deleteFile = deleteFile;
//# sourceMappingURL=shatabang_files.js.map