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
const express = __importStar(require("express"));
const shFiles = require('../common/shatabang_files');
const import_log_1 = __importDefault(require("../common/import_log"));
const router = express.Router();
const multer = require('multer');
let uploadDir;
let importDir;
let importLog;
router.initialize = function (config) {
    uploadDir = config.uploadDir;
    importDir = config.importDir;
    importLog = new import_log_1.default(config.cacheDir);
};
const partPrefix = 'part-';
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, uploadDir);
    },
    filename: function (req, file, callback) {
        const filename = partPrefix + Date.now() + '-' + file.originalname;
        console.log('Uploading: ', filename);
        callback(null, filename);
    }
});
const uploadSingle = multer({ storage: storage }).single('file');
const uploadMultiple = multer({ storage: storage }).array('files', 999);
router.post('/single', function (req, res) {
    uploadSingle(req, res, function (err) {
        if (err) {
            console.log(err);
            return res.status(500).end("Error uploading file.");
        }
        const file = req.file;
        shFiles.moveFile(file.path, importDir + '/' + file.filename.substr(partPrefix.length));
        console.log('Uploading done', file.filename);
        res.end("OK");
    });
});
router.post('/multiple', function (req, res) {
    uploadMultiple(req, res, function (err) {
        if (err) {
            console.log(err);
            return res.status(500).end("Error uploading files.");
        }
        res.end("OK");
    });
});
const importedRoute = function (req, res) {
    const lastId = req.params.lastId || 0;
    const lastTimeStamp = importLog.lastTimestamp();
    if (lastTimeStamp) {
        const lastModifiedDate = new Date();
        lastModifiedDate.setTime(lastTimeStamp);
        res.setHeader('Last-Modified', lastModifiedDate.toUTCString());
    }
    const response = JSON.stringify(importLog.tail(lastId));
    res.send(response.replace(/"/g, ''));
};
router.get('/imported/:lastId', importedRoute);
router.get('/imported', importedRoute);
exports.default = router;
//# sourceMappingURL=uploads.js.map