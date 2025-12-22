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
const file_type_regexp_1 = __importDefault(require("../modules/file_type_regexp"));
const THRESHOLD = Number(process.env.SH_FACE_THRESHOLD) || 34000;
/** Part one of detecting faces in images **/
const init = async function (config, task_queue) {
    const cacheDir = config.cacheDir;
    await shatabang_fra_1.default.initModel();
    task_queue.registerTaskProcessor('faces_find', function (data, job, done) {
        const relativeFilePath = file_type_regexp_1.default.toCacheImageFileName(data.file);
        const sourceFileName = path.resolve(path.join(cacheDir, "960", relativeFilePath));
        if (!shFiles.exists(sourceFileName)) {
            job.log('Missing file:' + sourceFileName);
            return done('Missing file:' + sourceFileName);
        }
        shatabang_fra_1.default.findFaces(sourceFileName).then(function (faces) {
            if (!faces.length) {
                // No face found
                done();
                return;
            }
            const promises = faces.filter(face => face.sz > THRESHOLD).map(async (face) => {
                const newFace = new Face();
                newFace.x = face.x;
                newFace.y = face.y;
                newFace.height = face.h;
                newFace.width = face.w;
                newFace.size = face.sz;
                newFace.imageId = data.id;
                await newFace.save();
                face.id = newFace._id;
                // Queue crop faces
                task_queue.queueTask('faces_crop', {
                    title: relativeFilePath,
                    file: relativeFilePath,
                    faceInfo: face
                });
            });
            return Promise.all(promises);
        })
            .then((arg) => {
            job.log('result', arg);
            done();
        })
            .catch((arg) => {
            job.log('error', arg);
            done(arg);
        });
    });
};
exports.default = {
    init
};
//# sourceMappingURL=faces_find.js.map