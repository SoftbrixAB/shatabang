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
const sort_file = function (sourceFile, destDir, exifData) {
    const dateStr = exifData.CreateDate || exifData.ModifyDate;
    if (dateStr === undefined) {
        throw new Error("Failed to parse the date in the exif information, '" + dateStr + "'");
    }
    const date = new Date(dateStr);
    const newPath = buildPathFromDate(date, destDir);
    const newFileName = buildFileNameFromDate(date, path.extname(sourceFile));
    return moveFile(sourceFile, newPath, newFileName);
};
const leftPad = function (d) {
    return ("" + d).padStart(2, "0");
};
const buildPathFromDate = function (date, destDir) {
    const year = "" + date.getFullYear();
    const month = leftPad(date.getMonth() + 1);
    const day = leftPad(date.getDate());
    return path.join(destDir, year, month, day);
};
const buildFileNameFromDate = function (date, fileExt) {
    const hh = leftPad(date.getHours());
    const mm = leftPad(date.getMinutes());
    const ss = leftPad(date.getSeconds());
    const ms = leftPad(date.getMilliseconds());
    return hh + mm + ss + ms + fileExt;
};
const moveFile = function (sourceFile, destinationDir, fileName) {
    if (!shFiles.exists(destinationDir)) {
        shFiles.mkdirsSync(destinationDir);
    }
    const destination = path.join(destinationDir, fileName).toLowerCase();
    return shFiles.moveFile(sourceFile, destination);
};
exports.default = sort_file;
//# sourceMappingURL=sort_file.js.map