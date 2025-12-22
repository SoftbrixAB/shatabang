import * as path from 'path';

const mediaFiles = /^(?!\.).+([mj]pe?g|png|mp4|m4a|m4v|mov|bmp|avi)$/i;
const exif = /^(?!\.).+(jpe?g|m4a|m4v|mp4)$/i;
const movieFile = /(m4v|mp4|mpe?g|mov|avi)$/i;
const imageFile = /(jpe?g|png|bmp)$/i;
const heicFile = /(heic|heif)$/i;

function replaceExtFunc(filePath: string, newExt: string): string {
  const fileInfo = path.parse(filePath);
  fileInfo.ext = newExt;
  fileInfo.base = fileInfo.name + '.' + fileInfo.ext;
  return path.format(fileInfo);
}

export default {
  mediaFiles,
  exif,
  movieFile,
  imageFile,

  isVideo(filePath: string): boolean {
    return movieFile.test(filePath);
  },

  isImage(filePath: string): boolean {
    return imageFile.test(filePath) || this.isHeicFile(filePath);
  },

  isHeicFile(filePath: string): boolean {
    return heicFile.test(filePath);
  },

  replaceExt: replaceExtFunc,

  toCacheImageFileName(movieFilePath: string): string {
    return replaceExtFunc(movieFilePath, 'jpg');
  }
};
