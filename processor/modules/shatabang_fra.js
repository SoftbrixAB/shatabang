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
/* Shatabang Face recognition algorithm */
const fs = __importStar(require("fs"));
const sharp = require('sharp');
const variance = require('variance');
const face_max_width = 100;
const face_max_height = 162; // Golden ratio
const PROBABILITY_LIMIT = 0.9;
// import nodejs bindings to native tensorflow, Use env variable TF_NO_GPU to load the cpu version
const tf = require('@tensorflow/tfjs-node');
const blazeface = require('@tensorflow-models/blazeface');
let model;
exports.default = {
    async initModel() {
        model = await blazeface.load();
    },
    findFaces(sourceFileName) {
        return fs.promises.access(sourceFileName, fs.constants.R_OK)
            .then(async () => {
            const fileData = await fs.promises.readFile(sourceFileName);
            const image = tf.node.decodeImage(fileData);
            const returnTensors = false; // Pass in `true` to get tensors back, rather than values.
            const predictions = await model.estimateFaces(image, returnTensors);
            const [img_height, img_width] = image.shape;
            const newFaces = predictions.filter((t) => t.probability[0] > PROBABILITY_LIMIT).map(function (face) {
                // Info will contain position and sizes as fractions
                face.width = face.bottomRight[0] - face.topLeft[0];
                face.height = face.bottomRight[1] - face.topLeft[1];
                const info = {
                    x: face.topLeft[0] / img_width,
                    y: face.topLeft[1] / img_height,
                    w: face.width / img_width, // Width
                    h: face.height / img_height, // Height
                    sz: face.width * face.height,
                    pr: face.probability[0]
                };
                return info;
            });
            return newFaces;
        });
    },
    cropFace(sourceFileName, face) {
        // Expand the face area
        // TODO: Explore the optimal way for eigenfaces or other tool
        const width = face.w || face.width;
        const height = face.h || face.height;
        const dw = width / 10; // This could be a value between 0 and 1
        const dh = height / 10;
        let ext = {
            left: face.x - dw,
            top: face.y - 3 * dh,
            width: width + 2 * dw,
            height: height + 5 * dh
        };
        ext.left = ext.left > 0 ? ext.left : 0;
        ext.top = ext.top > 0 ? ext.top : 0;
        ext.width = ext.left + ext.width > 1 ? 1 - ext.left : ext.width;
        ext.height = ext.top + ext.height > 1 ? 1 - ext.top : ext.height;
        // Clip face part from image. Max size 100x150px
        const image = sharp(sourceFileName);
        return image
            .metadata()
            .then(function (metadata) {
            ext.left = Math.round(ext.left * metadata.width);
            ext.top = Math.round(ext.top * metadata.height);
            ext.height = Math.round(ext.height * metadata.height);
            ext.width = Math.round(ext.width * metadata.width);
            return image
                .extract(ext)
                .resize(face_max_width, face_max_height, { withoutEnlargement: true, fit: "inside" })
                .png()
                .toBuffer();
        });
    },
    imageBlurValue(source) {
        // Inspired from https://www.pyimagesearch.com/2015/09/07/blur-detection-with-opencv/
        const sType = typeof source;
        if (sType !== "string" && !Buffer.isBuffer(source)) {
            return Promise.reject("Unknown source: " + sType);
        }
        const image = sharp(source);
        return new Promise((resolve, reject) => {
            image.greyscale()
                .convolve({
                width: 3,
                height: 3,
                kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0]
            })
                .raw()
                .toBuffer(function (err, data) {
                if (err) {
                    return reject(err);
                }
                resolve(variance(data));
            });
        });
    }
};
//# sourceMappingURL=shatabang_fra.js.map