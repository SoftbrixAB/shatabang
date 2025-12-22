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
const shFiles = require('../common/shatabang_files');
/**
 * This method will move all media files in unknown directory back to the
 * import directory so they can be processed again. This could be run after an upgrade
 * with new import functionality or media support.
 */
const init = function (config, task_queue) {
    const importDir = config.dirs.import;
    const unknownDir = config.dirs.unknown;
    task_queue.registerTaskProcessor('retry_unknown', function (data, job, done) {
        shFiles.listMediaFiles(unknownDir, function (err, mediaFiles) {
            if (err) {
                console.error(err);
                return done(err);
            }
            mediaFiles.forEach(function (filePath) {
                const newPath = path.join(importDir, path.basename(filePath));
                shFiles.moveFile(filePath, newPath);
            });
            done();
        });
    });
};
exports.default = {
    init
};
//# sourceMappingURL=retry_unknown.js.map