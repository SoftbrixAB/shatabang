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
const path = __importStar(require("path"));
const Face = require('../common/models/face');
const shFiles = require('../common/shatabang_files');
const shatabang_fra_1 = __importDefault(require("../modules/shatabang_fra"));
/** Part one of detecting faces in images **/
const init = function (config, task_queue) {
    const cacheDir = config.cacheDir;
    task_queue.registerTaskProcessor('faces_crop', function (data, job, done) {
        const relativeFilePath = data.file;
        const sourceFileName = path.resolve(path.join(cacheDir, "1920", relativeFilePath));
        if (!shFiles.exists(sourceFileName)) {
            return done('Missing file:' + sourceFileName);
        }
        const face = data.faceInfo;
        // Save the buffer and store the new index to the face info
        return shatabang_fra_1.default.cropFace(sourceFileName, face)
            .then(async (buffer) => {
            await Face.findByIdAndUpdate(face.id, { "buffer": buffer });
            return buffer;
        })
            .then(shatabang_fra_1.default.imageBlurValue)
            .then(function (sharpness) {
            return Face.findByIdAndUpdate(face.id, { "sharpness": sharpness });
        })
            .then((arg) => {
            job.log(arg);
            done();
        })
            .catch((arg) => {
            job.log(arg);
            done(arg);
        });
    });
};
exports.default = {
    init
};
//# sourceMappingURL=faces_crop.js.map