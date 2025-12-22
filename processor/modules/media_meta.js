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
exports.default = default_1;
const _ = __importStar(require("underscore"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DEFAULT_FILE_NAME = 'media.meta';
const _instance = function (cacheDirectory, fileName) {
    fileName = fileName || DEFAULT_FILE_NAME;
    const metaFilePath = path.join(cacheDirectory, fileName);
    let _objs;
    let _readDeferred;
    const _flush = function () {
        fs.writeFile(metaFilePath, JSON.stringify(_objs), (err) => {
            if (err) {
                console.log(err);
            }
        });
    };
    const _throttledFlush = _.throttle(_flush, 1000);
    return {
        // Read multiple
        getAll() {
            if (!_.isUndefined(_objs)) {
                return Promise.resolve(_objs);
            }
            if (!_.isUndefined(_readDeferred)) {
                return _readDeferred;
            }
            _readDeferred = new Promise(function (resolve, reject) {
                fs.readFile(metaFilePath, (err, data) => {
                    if (err) {
                        // ENOENT = File is missing
                        if (err.code !== 'ENOENT') {
                            reject(err);
                            return;
                        }
                    }
                    if (_.isUndefined(data)) {
                        // No file found, initialize empty object
                        _objs = {};
                    }
                    else {
                        _objs = JSON.parse(data.toString());
                        if (!_.isObject(_objs)) {
                            reject('Stored type is not an object');
                            return;
                        }
                    }
                    resolve(_objs);
                });
            });
            return _readDeferred;
        },
        // Read single
        get(key) {
            return this.getAll().then((objs) => {
                return objs[key];
            });
        },
        // Read index
        getKeys() {
            return this.getAll().then((objs) => {
                return _.keys(objs);
            });
        },
        // Create / update
        set(key, meta) {
            return this.getAll().then((objs) => {
                objs[key] = meta;
                _throttledFlush();
                return meta;
            });
        },
        // Delete
        delete(key) {
            return this.getAll().then((objs) => {
                const val = objs[key];
                delete objs[key];
                _throttledFlush();
                return val;
            });
        }
    };
};
const _instanceCache = {};
function default_1(cacheDirectory) {
    // This will keep a lot in memory but will reuse the instances in the same
    // process thus enable multiple read and writes from different parts of the application.
    if (_.isUndefined(_instanceCache[cacheDirectory])) {
        _instanceCache[cacheDirectory] = _instance(cacheDirectory);
        // TODO: Add support to unload an instance from the cache.
    }
    return _instanceCache[cacheDirectory];
}
//# sourceMappingURL=media_meta.js.map