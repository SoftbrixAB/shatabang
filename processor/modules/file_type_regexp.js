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
const mediaFiles = /^(?!\.).+([mj]pe?g|png|mp4|m4a|m4v|mov|bmp|avi)$/i;
const exif = /^(?!\.).+(jpe?g|m4a|m4v|mp4)$/i;
const movieFile = /(m4v|mp4|mpe?g|mov|avi)$/i;
const imageFile = /(jpe?g|png|bmp)$/i;
const heicFile = /(heic|heif)$/i;
function replaceExtFunc(filePath, newExt) {
    const fileInfo = path.parse(filePath);
    fileInfo.ext = newExt;
    fileInfo.base = fileInfo.name + '.' + fileInfo.ext;
    return path.format(fileInfo);
}
exports.default = {
    mediaFiles,
    exif,
    movieFile,
    imageFile,
    isVideo(filePath) {
        return movieFile.test(filePath);
    },
    isImage(filePath) {
        return imageFile.test(filePath) || this.isHeicFile(filePath);
    },
    isHeicFile(filePath) {
        return heicFile.test(filePath);
    },
    replaceExt: replaceExtFunc,
    toCacheImageFileName(movieFilePath) {
        return replaceExtFunc(movieFilePath, 'jpg');
    }
};
//# sourceMappingURL=file_type_regexp.js.map