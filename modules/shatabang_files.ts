import * as dir from 'node-dir';
import * as path from 'path';
import { exec } from 'child_process';
import * as fs from 'fs-extra';

type FileCallback = (err?: string | Error, result?: any) => void;

const fileEditFallback = (
  fileHandlingMethod: string,
  source: string,
  newDestination: string,
  resolve: (value: string, source?: string) => void,
  reject: (reason?: any) => void
) => {
  const command = `${fileHandlingMethod} "${source}" "${newDestination}"`;

  return (error?: any) => {
    if (error) {
      // Cross device move
      if (error.code === 'EXDEV') {
        exec(command, (error) => {
          if (error) {
            console.log(command, error);
            reject(error);
          } else {
            resolve(newDestination, source);
          }
        });
      } else {
        console.error('Move error', error);
        reject(error);
      }
    } else {
      resolve(newDestination, source);
    }
  };
};

const findAvaliableFileName = (destination: string, retryCnt: number = 0): Promise<string> => {
  let newDestination = destination;
  if (retryCnt > 0) {
    const fileInfo = path.parse(destination);
    fileInfo.name = fileInfo.name + '_' + retryCnt;
    fileInfo.base = fileInfo.name + fileInfo.ext;
    newDestination = path.format(fileInfo);
  }
  return new Promise((resolve, reject) => {
    fs.access(newDestination, fs.constants.F_OK, (err) => {
      if (!err) {
        findAvaliableFileName(destination, (retryCnt || 0) + 1).then(
          (name) => resolve(name),
          (error) => reject(error)
        );
      } else {
        resolve(newDestination);
      }
    });
  });
};

export const basename = path.basename;
export const diname = path.dirname;
export const extname = path.extname;
export const ensureDir = fs.ensureDir;

export const listMediaFiles = (sourceDir: string, callback?: FileCallback): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    if (callback === undefined) {
      callback = (err, result) => {
        if (err !== undefined) {
          reject(err);
        }
        resolve(result);
      };
    }
    dir.files(sourceDir, (err: Error | null, files?: string[]) => {
      if (err) {
        callback!(err);
        return;
      }
      if (files === undefined) {
        callback!('Directory not found');
        return;
      }

      const mediaFiles = /^(?!\.).+([mj]pe?g|png|mp4|m4a|m4v|mov|bmp|avi|heic)$/i;
      const filteredFiles = files.filter((item) => mediaFiles.test(path.basename(item)));

      callback!(undefined, filteredFiles);
    });
  });
};

/**
 * Only list the direct sub directories
 */
export const listSubDirs = (sourceDir: string, callback: FileCallback): void => {
  callback(
    undefined,
    fs.readdirSync(sourceDir).filter((file) => {
      return fs.statSync(path.join(sourceDir, file)).isDirectory();
    })
  );
};

export const listSubDirsAsync = async (sourceDir: string): Promise<string[]> => {
  return new Promise((resolve) => {
    listSubDirs(sourceDir, (_ignore, dirs) => resolve(dirs));
  });
};

// List all subdir paths
export const listSubDirPaths = (sourceDir: string, callback: FileCallback): void => {
  dir.subdirs(sourceDir, callback);
};

/**
 * The write file method will first create the folder for the file to be in
 */
export const writeFile = (filePath: string, fileContent: any, callback: FileCallback): void => {
  fs.mkdirs(path.dirname(filePath), (error) => {
    if (error) {
      console.log(filePath, 'Error: ' + error.message);
    }
    fs.writeFile(filePath, fileContent, callback);
  });
};

export const readFile = fs.readFile;
export const rmDirSync = fs.rmdirSync;
export const mkdirs = fs.mkdirs;
export const mkdirsSync = fs.mkdirsSync;

export const exists = (filePath: string): boolean => {
  try {
    fs.statSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
};

export const rename = fs.rename;
export const move = fs.move;

export const moveFile = (source: string, destination: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    findAvaliableFileName(destination).then((newDestination) => {
      fs.rename(source, newDestination, fileEditFallback("mv", source, newDestination, resolve, reject));
      return newDestination;
    });
  });
};

export const copy = fs.copy;

export const copyFile = (source: string, destination: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    findAvaliableFileName(destination).then((newDestination) => {
      fs.copy(source, newDestination, fileEditFallback("mv", source, newDestination, resolve as any, reject));
    });
  });
};

export const deleteFile = (source: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(source, (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
};
