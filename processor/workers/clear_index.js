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
const shIndex = require('stureby-index');
const init = function (config, task_queue) {
    const cacheDir = config.cacheDir;
    /*
     * data.index_name = relative path of the file from the storageDir
     */
    task_queue.registerTaskProcessor('clear_index', function (data, job, done) {
        const index_name = data.index_name;
        if (index_name === undefined || !index_name.startsWith('idx')) {
            console.log('Not an index: ' + index_name);
            done('Given parameter index_name was not an index: ' + index_name);
            return;
        }
        const idx = path.join(cacheDir, data.index_name);
        // Reinitialize the index
        const index = shIndex(idx);
        index.clear();
        if (index.keys().length === 0) {
            done();
        }
        else {
            done('Failed to remove index');
        }
    });
};
exports.default = {
    init
};
//# sourceMappingURL=clear_index.js.map