"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const directory_list_1 = __importDefault(require("../modules/directory_list"));
const init = function (config, task_queue) {
    const cacheDir = config.cacheDir;
    // Search the source dir so we know if the source is an image or a video
    // Drawback is that we list files which has not been processed, thus not
    // having a thumbnail
    const searchDir = config.storageDir;
    task_queue.registerTaskProcessor('update_directory_list', async function (data, _job, done) {
        if (data.dir) {
            await directory_list_1.default.processDirectory(data.dir, searchDir, cacheDir);
        }
        else {
            directory_list_1.default.clearMediaListFiles(cacheDir);
            await directory_list_1.default.processSubDirectories(searchDir, cacheDir);
        }
        done();
    });
};
exports.default = {
    init
};
//# sourceMappingURL=update_directory_list.js.map