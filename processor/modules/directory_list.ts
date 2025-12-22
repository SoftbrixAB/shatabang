const shFiles = require('../common/shatabang_files');
import * as path from 'path';

// file list is a lot of entries like '/year/month/day/time.xyz'
const fileDateRegexp = /^([\d]{2,4}).?(\d{1,2}).?(\d{1,2}).?(\d{1,6})/;

const sortFileListByDate = function(fileList: string[]): string[] {
  return fileList.sort(function(b, a) {
    const regExpA = fileDateRegexp.exec(a) || { length: 0 };
    const regExpB = fileDateRegexp.exec(b) || { length: 0 };
    if (regExpA.length < 5 || regExpA.length !== regExpB.length) {
      return regExpA.length - regExpB.length;
    }
    if (regExpA[1] === regExpB[1]) {
      if (regExpA[2] === regExpB[2]) {
        return Number(regExpA[3]) - Number(regExpB[3]);
      }
      return Number(regExpA[2]) - Number(regExpB[2]);
    }
    return Number(regExpA[1]) - Number(regExpB[1]);
  });
};

const findMediaFiles = function(directory: string, sourceDir: string): Promise<string[]> {
  return new Promise(function(resolve, reject) {
    shFiles.listMediaFiles(path.join(sourceDir, directory), function(err: Error | null, filesList: string[]) {
      if (err) {
        reject(err);
        return;
      }

      let relativeFilesList = filesList.map(function(item) {
        return path.relative(sourceDir, item);
      });

      relativeFilesList = sortFileListByDate(relativeFilesList);

      resolve(relativeFilesList);
    });
  });
};

const clearMediaListFiles = function(cacheDir: string): void {
  const infoDirectory = path.join(cacheDir, 'info');
  shFiles.rmDirSync(infoDirectory, { recursive: true });
};

const writeMediaListFile = function(directory: string, cachedDir: string, relativeFilesList: string): Promise<string> {
  return new Promise(function(resolve, reject) {
    const mediaListFile = path.join(cachedDir, 'info', directory, 'media.lst');
    shFiles.writeFile(mediaListFile, relativeFilesList, function(err: Error | null) {
      if (err) {
        reject(err);
        return;
      }
      console.log("The file was saved: ", directory);
      resolve(mediaListFile);
    });
  });
};

const addMediaListFile = function(directory: string, cachedDir: string, relativeFile: string): Promise<string> {
  return new Promise(function(resolve, reject) {
    const mediaListFile = path.join(cachedDir, 'info', directory, 'media.lst');

    if (shFiles.exists(mediaListFile)) {
      shFiles.readFile(mediaListFile, (err: Error | null, fileData: string) => {
        if (err != undefined) {
          reject(err);
          return;
        }

        fileData += ',' + relativeFile;

        writeMediaListFile(directory, cachedDir, fileData)
          .then(resolve, reject);
      });
    } else {
      writeMediaListFile(directory, cachedDir, relativeFile)
        .then(resolve, reject);
    }
  });
};

/**
 * Processes the year directory and put file list in cache, then generate
 * thumbnails for all items.
 */
const processDirectory = function(directory: string, sourceDir: string, cachedDir: string): Promise<string> {
  return findMediaFiles(directory, sourceDir).then(function(relativeFilesList) {
    return writeMediaListFile(directory, cachedDir, relativeFilesList.join(','));
  });
};

const processSubDirectories = function(directory: string, cachedDir: string): Promise<string[]> {
  return new Promise(function(resolve, reject) {
    shFiles.listSubDirs(directory, (err: Error | null, dirs: string[]) => {
      if (err !== undefined) {
        reject(err);
      }
      const qs = dirs.map(dir => {
        return processDirectory(dir, directory, cachedDir);
      });
      Promise.all(qs).then(resolve, reject);
    });
  });
};

export default {
  clearMediaListFiles,
  findMediaFiles,
  processSubDirectories,
  processDirectory,
  sortFileListByDate,
  writeMediaListFile,
  addMediaListFile
};
