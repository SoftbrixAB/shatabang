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
const express = __importStar(require("express"));
const router = express.Router();
const indexes = require('../common/indexes');
const shFiles = require('../common/shatabang_files');
const task_queue = require('../common/task_queue');
let sourceDir;
let cacheDir;
let deletedDir;
let timesIndex;
let apiEndpoint;
router.initialize = function (config) {
    sourceDir = config.storageDir;
    cacheDir = config.cacheDir;
    deletedDir = config.deletedDir;
    timesIndex = indexes.importedTimesIndex(config.cacheDir);
    apiEndpoint = 'https://photoslibrary.googleapis.com';
};
router.post('/delete', function (req, res) {
    if (!req.body.length) {
        res.send("Missing post data").status(400);
        return;
    }
    req.body.forEach(function (reference) {
        const sourceFile = path.join(sourceDir, reference);
        const destFile = path.join(deletedDir, path.basename(reference));
        const cache300 = path.join(cacheDir, '300', reference);
        const cache1920 = path.join(cacheDir, '1920', reference);
        shFiles.moveFile(sourceFile, destFile)
            .then(console.log, function (error) {
            console.log('Error:', error);
        });
        shFiles.deleteFile(cache300);
        shFiles.deleteFile(cache1920);
        const elem = Object.entries(timesIndex.toJSON()).find(([key, value]) => value && value.indexOf && value.indexOf(reference) > -1);
        if (elem != undefined) {
            timesIndex.delete(elem[0]);
        }
        const directory = reference.split(path.sep)[0];
        task_queue.queueTask('update_directory_list', { title: directory, dir: directory }, 'high');
    });
    res.send("OK").status(200);
});
router.get('/listgoo', async (req, res) => {
    let photos = [];
    try {
        let parameters = {
            pageSize: 100
        };
        const photosToLoad = req.query.l || 200;
        res.write("[");
        do {
            console.log(`Submitting search with parameters: ${JSON.stringify(parameters)}`);
            // Make a POST request to search the library or album
            const result = await fetch(apiEndpoint + '/v1/mediaItems:search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.user.token}`
                },
                body: JSON.stringify(parameters),
            });
            // Set the pageToken for the next request.
            parameters.pageToken = result.nextPageToken;
            // The list of media items returned may be sparse and contain missing
            // elements. Remove all invalid elements.
            // Also remove all elements that are not images by checking its mime type.
            // Media type filters can't be applied if an album is loaded, so an extra
            // filter step is required here to ensure that only images are returned.
            const items = result && result.mediaItems ?
                result.mediaItems
                    .filter((x) => x) // Filter empty or invalid items.
                // Only keep media items with an image mime type.
                // .filter(x => x.mimeType && x.mimeType.startsWith('image/'))
                : [];
            for (let i = 0; i < items.length - 1; i++) {
                res.write(JSON.stringify(items[i]) + ',');
            }
            photos = photos.concat(items);
            console.log(photos.length);
        } while (photos.length < photosToLoad &&
            parameters.pageToken != null);
        res.write("'']"); //array ending bracket
        res.end();
        shFiles.writeFile("./photo_data.json", JSON.stringify(photos));
    }
    catch (err) {
        console.log("error", err);
        res.send(err.message);
    }
});
exports.default = router;
//# sourceMappingURL=images.js.map