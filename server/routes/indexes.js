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
const bodyParser = __importStar(require("body-parser"));
const express = __importStar(require("express"));
const router = express.Router();
const indexes = require('../common/indexes');
router.initialize = function (config) {
    router.get('/sha/keys', getKeys(indexes.fileShaIndex(config.cacheDir)));
    router.get('/fingers/keys', getKeys(indexes.imgFingerIndex(config.cacheDir)));
    router.get('/rating/keys', getKeys(indexes.ratingIndex(config.cacheDir)));
    router.post('/rating/add', function (req, res) {
        const file = req.body.file;
        const rating = req.body.rating;
        if (!file || !rating) {
            res.status(400).send("Missing required parameters, file and/or rating").end();
            return;
        }
        if (rating < 0 || rating > 1) {
            res.status(400).send("Rating should be between 0 and 1").end();
            return;
        }
        const idx = indexes.ratingIndex(config.cacheDir);
        idx.put(file, rating);
        res.end();
    });
    router.use('/rating/add', bodyParser.urlencoded({ extended: true }));
};
const getKeys = function (idx) {
    return function (req, res) {
        res.setHeader('content-type', 'application/json');
        res.json(idx.keys()).end();
    };
};
exports.default = router;
//# sourceMappingURL=indexes.js.map