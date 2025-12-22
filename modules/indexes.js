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
exports.ratingIndex = exports.importedTimesIndex = exports.imgFingerIndex = exports.fileShaIndex = exports.regionsIndex = exports.metaIndex = exports.keywordsIndex = void 0;
const vemdalenIndex = __importStar(require("vemdalen-index"));
const shIndex = __importStar(require("stureby-index"));
const path = __importStar(require("path"));
const keywordsIndex = (redisClient) => vemdalenIndex('keywords', {
    indexType: 'strings_unique',
    client: redisClient
});
exports.keywordsIndex = keywordsIndex;
const metaIndex = (redisClient) => vemdalenIndex('meta', {
    indexType: 'object',
    client: redisClient
});
exports.metaIndex = metaIndex;
const regionsIndex = (redisClient) => vemdalenIndex('metaRegions', {
    indexType: 'object',
    client: redisClient
});
exports.regionsIndex = regionsIndex;
const fileShaIndex = (cacheDir) => shIndex(path.join(cacheDir, 'idx_file_sha'));
exports.fileShaIndex = fileShaIndex;
const imgFingerIndex = (cacheDir) => shIndex(path.join(cacheDir, 'idx_finger'));
exports.imgFingerIndex = imgFingerIndex;
const importedTimesIndex = (cacheDir, options) => shIndex(path.join(cacheDir, 'idx_imported'), options);
exports.importedTimesIndex = importedTimesIndex;
const ratingIndex = (cacheDir) => shIndex(path.join(cacheDir, 'idx_rating'));
exports.ratingIndex = ratingIndex;
//# sourceMappingURL=indexes.js.map