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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var path = __importStar(require("path"));
var express = __importStar(require("express"));
var router = express.Router();
var indexes = require('../common/indexes');
var shFiles = require('../common/shatabang_files');
var task_queue = require('../common/task_queue');
var sourceDir;
var cacheDir;
var deletedDir;
var timesIndex;
var apiEndpoint;
router.initialize = function (config) {
    sourceDir = config.storageDir;
    cacheDir = config.cacheDir;
    deletedDir = config.deletedDir;
    timesIndex = indexes.importedTimesIndex(config.cacheDir);
    apiEndpoint = 'https://photoslibrary.googleapis.com';
};
router.post('/delete', function (req, res) {
    if (!req.body.length) {
        res.status(400).send("Missing post data");
        return;
    }
    req.body.forEach(function (reference) {
        var sourceFile = path.join(sourceDir, reference);
        var destFile = path.join(deletedDir, path.basename(reference));
        var cache300 = path.join(cacheDir, '300', reference);
        var cache1920 = path.join(cacheDir, '1920', reference);
        shFiles.moveFile(sourceFile, destFile)
            .then(console.log, function (error) {
            console.log('Error:', error);
        });
        shFiles.deleteFile(cache300);
        shFiles.deleteFile(cache1920);
        var elem = Object.entries(timesIndex.toJSON()).find(function (_a) {
            var key = _a[0], value = _a[1];
            return value && value.indexOf && value.indexOf(reference) > -1;
        });
        if (elem != undefined) {
            timesIndex.delete(elem[0]);
        }
        var directory = reference.split(path.sep)[0];
        task_queue.queueTask('update_directory_list', { title: directory, dir: directory }, 'high');
    });
    res.status(200).send("OK");
});
router.get('/listgoo', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var photos, parameters, photosToLoad, result, items, i, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                photos = [];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                parameters = {
                    pageSize: 100
                };
                photosToLoad = req.query.l || 200;
                res.write("[");
                _a.label = 2;
            case 2:
                console.log("Submitting search with parameters: ".concat(JSON.stringify(parameters)));
                return [4 /*yield*/, fetch(apiEndpoint + '/v1/mediaItems:search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': "Bearer ".concat(req.user.token)
                        },
                        body: JSON.stringify(parameters),
                    })];
            case 3:
                result = _a.sent();
                // Set the pageToken for the next request.
                parameters.pageToken = result.nextPageToken;
                items = result && result.mediaItems ?
                    result.mediaItems
                        .filter(function (x) { return x; }) // Filter empty or invalid items.
                    // Only keep media items with an image mime type.
                    // .filter(x => x.mimeType && x.mimeType.startsWith('image/'))
                    : [];
                for (i = 0; i < items.length - 1; i++) {
                    res.write(JSON.stringify(items[i]) + ',');
                }
                photos = photos.concat(items);
                console.log(photos.length);
                _a.label = 4;
            case 4:
                if (photos.length < photosToLoad &&
                    parameters.pageToken != null) return [3 /*break*/, 2];
                _a.label = 5;
            case 5:
                res.write("'']"); //array ending bracket
                res.end();
                shFiles.writeFile("./photo_data.json", JSON.stringify(photos));
                return [3 /*break*/, 7];
            case 6:
                err_1 = _a.sent();
                console.log("error", err_1);
                res.send(err_1.message);
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
