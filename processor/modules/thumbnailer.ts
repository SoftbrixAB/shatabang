import FileTypeRegexp from './file_type_regexp';
import * as fs from 'fs-extra';
import * as path from 'path';
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const phash = require('sharp-phash');
const { promisify } = require('util');
const convert = require('heic-convert');

function binaryToHex(binary: string): string {
  return binary.replace(/[01]{4}/g, function(v) {
    return parseInt(v, 2).toString(16);
  });
}

function hexToBinary(binary: string): string {
  return binary.replace(/[0123456789abcdefgh]{2}/g, function(v) {
    return ("00000000" + (parseInt(v, 16)).toString(2)).substr(-8);
  });
}

export default {
  generateThumbnail(sourceFileName: string, outputFileName: string, width: number | undefined, height: number | undefined, isMaxSize?: boolean): Promise<string> {
    return new Promise(async function(resolve, reject) {
      if (FileTypeRegexp.isVideo(path.basename(sourceFileName))) {
        return reject('Source file is a video, need to extract screenshots');
      }

      try {
        await fs.ensureDir(path.dirname(outputFileName));
        const image = sharp(sourceFileName, { failOnError: process.env.SHARP_FAIL_ON_ERROR });
        if (isMaxSize) {
          const metadata = await image.metadata();
          const imgAspect = metadata.width! / metadata.height!;
          if (imgAspect > 1) {
            // Image is wider
            height = undefined;
          } else {
            width = undefined;
          }
        }
        await image.rotate()
          .resize(width, height)
          .jpeg({ mozjpeg: true })
          .toFile(outputFileName);
        resolve(outputFileName);
      } catch (e) {
        console.log('Failed to resize', e);
        reject(e);
      }
    });
  },

  screenshots(sourceFile: string, destFile: string, timestamps?: string[]): Promise<string> {
    timestamps = timestamps || ['10%'];

    return new Promise(async function(resolve, reject) {
      try {
        const destFolder = path.dirname(destFile);
        const destFileName = path.basename(destFile);

        await fs.mkdirs(destFolder);
        // console.log('Creating video thumb: ', sourceFile, destFile);
        ffmpeg(sourceFile)
          .on('error', function(err: Error) {
            reject(err);
          })
          .on('end', function() {
            resolve(destFileName);
          })
          .screenshots({
            timestamps: timestamps,
            filename: destFileName,
            folder: destFolder
          });
      } catch (err) {
        console.log('catched', sourceFile, err);
        reject(err);
      }
    });
  },

  thumbnailNeedsUpdate(sourceFileName: string, destFileName: string): boolean {
    let destSync;
    try {
      destSync = fs.statSync(FileTypeRegexp.toCacheImageFileName(destFileName));
    } catch (error) {
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

  async create_image_finger(sourceFile: string): Promise<string> {
    // Is this a supported movie file?
    const sourceFileName = path.basename(sourceFile);
    if (FileTypeRegexp.isVideo(sourceFileName)) {
      return Promise.reject('Source file is a video, need to extract screenshots');
    } else {
      try {
        fs.statSync(sourceFile);
      } catch (e) {
        return Promise.reject(e);
      }
      return phash(sourceFile)
        .then(function(bitString: string) {
          return binaryToHex(bitString);
        });
    }
  },

  async convertHeicToJpg(sourceFile: string, destFile: string): Promise<void> {
    const inputBuffer = await promisify(fs.readFile)(sourceFile);
    const outputBuffer = await convert({
      buffer: inputBuffer, // the HEIC file buffer
      format: 'JPEG',      // output format
      quality: 1           // the jpeg compression quality, between 0 and 1
    });

    return promisify(fs.writeFile)(destFile, outputBuffer);
  }
};
