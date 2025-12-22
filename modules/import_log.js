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
const ArrayCache = require('idre-array-cache');
let lastTimestamp = Date.now();
class ImportLog {
    constructor(cacheDir) {
        const importLogPath = path.join(cacheDir, 'importlog');
        this._log = new ArrayCache();
        // The open call is async but this should be fine and the ArrayCache is self healing
        this._log.open(importLogPath); // Delay option is default 200ms
        this._log.on('change', () => {
            lastTimestamp = Date.now();
        });
    }
    push(id) {
        if (!Number.isInteger(id)) {
            throw new Error('Expected {id} to be numeric, was: ' + typeof id + '/' + id);
        }
        this._log.push(id);
    }
    async clear() {
        await this._log.clear();
    }
    async close() {
        await this._log.close();
    }
    slice(start, end) {
        return this._log.slice(start, end);
    }
    tail(index) {
        return this._log.slice(index);
    }
    lastTimestamp() {
        return lastTimestamp;
    }
}
exports.default = ImportLog;
//# sourceMappingURL=import_log.js.map