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
const file_type_regexp_1 = __importDefault(require("./file_type_regexp"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const phash = require('sharp-phash');
const { promisify } = require('util');
const convert = require('heic-convert');
function binaryToHex(binary) {
    return binary.replace(/[01]{4}/g, function (v) {
        return parseInt(v, 2).toString(16);
    });
}
function hexToBinary(binary) {
    return binary.replace(/[0123456789abcdefgh]{2}/g, function (v) {
        return ("00000000" + (parseInt(v, 16)).toString(2)).substr(-8);
    });
}
exports.default = {
    generateThumbnail(sourceFileName, outputFileName, width, height, isMaxSize) {
        return new Promise(async function (resolve, reject) {
            if (file_type_regexp_1.default.isVideo(path.basename(sourceFileName))) {
                return reject('Source file is a video, need to extract screenshots');
            }
            try {
                await fs.ensureDir(path.dirname(outputFileName));
                const image = sharp(sourceFileName, { failOnError: process.env.SHARP_FAIL_ON_ERROR });
                if (isMaxSize) {
                    const metadata = await image.metadata();
                    const imgAspect = metadata.width / metadata.height;
                    if (imgAspect > 1) {
                        // Image is wider
                        height = undefined;
                    }
                    else {
                        width = undefined;
                    }
                }
                await image.rotate()
                    .resize(width, height)
                    .jpeg({ mozjpeg: true })
                    .toFile(outputFileName);
                resolve(outputFileName);
            }
            catch (e) {
                console.log('Failed to resize', e);
                reject(e);
            }
        });
    },
    screenshots(sourceFile, destFile, timestamps) {
        timestamps = timestamps || ['10%'];
        return new Promise(async function (resolve, reject) {
            try {
                const destFolder = path.dirname(destFile);
                const destFileName = path.basename(destFile);
                await fs.mkdirs(destFolder);
                // console.log('Creating video thumb: ', sourceFile, destFile);
                ffmpeg(sourceFile)
                    .on('error', function (err) {
                    reject(err);
                })
                    .on('end', function () {
                    resolve(destFileName);
                })
                    .screenshots({
                    timestamps: timestamps,
                    filename: destFileName,
                    folder: destFolder
                });
            }
            catch (err) {
                console.log('catched', sourceFile, err);
                reject(err);
            }
        });
    },
    thumbnailNeedsUpdate(sourceFileName, destFileName) {
        let destSync;
        try {
            destSync = fs.statSync(file_type_regexp_1.default.toCacheImageFileName(destFileName));
        }
        catch (error) {
            // ignore
            // console.log('statSync',error);
        }
        if (destSync === undefined) {
            return true;
        }
        const sourceSync = fs.statSync(sourceFileName);
        const destFileEdited = new Date(destSync.mtime);
        const srcFileEdited = new Date(sourceSync.mtime);
        // console.log(destFileEdited.getTime(),' < ', srcFileEdited.getTime());
        return destFileEdited.getTime() < srcFileEdited.getTime();
    },
    async create_image_finger(sourceFile) {
        // Is this a supported movie file?
        const sourceFileName = path.basename(sourceFile);
        if (file_type_regexp_1.default.isVideo(sourceFileName)) {
            return Promise.reject('Source file is a video, need to extract screenshots');
        }
        else {
            try {
                fs.statSync(sourceFile);
            }
            catch (e) {
                return Promise.reject(e);
            }
            return phash(sourceFile)
                .then(function (bitString) {
                return binaryToHex(bitString);
            });
        }
    },
    async convertHeicToJpg(sourceFile, destFile) {
        const inputBuffer = await promisify(fs.readFile)(sourceFile);
        const outputBuffer = await convert({
            buffer: inputBuffer, // the HEIC file buffer
            format: 'JPEG', // output format
            quality: 1 // the jpeg compression quality, between 0 and 1
        });
        return promisify(fs.writeFile)(destFile, outputBuffer);
    }
};
//# sourceMappingURL=thumbnailer.js.map