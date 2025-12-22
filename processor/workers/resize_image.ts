import * as path from 'path';
import fileTypeRegexp from '../modules/file_type_regexp';
import thumbnailer from '../modules/thumbnailer';
const shFiles = require('../common/shatabang_files');

const PREFIX = 'v';

interface Config {
  storageDir: string;
  cacheDir: string;
}

interface TaskQueue {
  registerTaskProcessor(taskName: string, processor: (data: any, job: any, done: (err?: any) => void) => void | Promise<void>): void;
}

const init = function(config: Config, task_queue: TaskQueue): void {
  const storageDir = config.storageDir;
  const cacheDir = config.cacheDir;

  task_queue.registerTaskProcessor('resize_image', async function(data, job, done) {
    const width = data.width;
    const relativeFilePath = data.file;
    const outputImgFileName = fileTypeRegexp.toCacheImageFileName(path.basename(relativeFilePath));
    const outputFileName = path.join(cacheDir, '' + width, path.dirname(relativeFilePath), outputImgFileName);
    let sourceFileName = path.join(storageDir, relativeFilePath);

    if (!data.forceUpdate && shFiles.exists(outputFileName)) {
      job.log('Already exists: ' + outputFileName);
      return done();
    }

    if (fileTypeRegexp.isVideo(sourceFileName)) {
      const videoTmpDir = path.join(cacheDir, '1920', path.dirname(relativeFilePath));
      const tmpFileName = path.join(videoTmpDir, PREFIX + outputImgFileName);
      await shFiles.ensureDir(path.dirname(tmpFileName));
      await thumbnailer.screenshots(sourceFileName, tmpFileName, ['10%']);
      sourceFileName = tmpFileName;
    } else if (fileTypeRegexp.isHeicFile(sourceFileName)) {
      const heicTmpDir = path.join(cacheDir, '1920', path.dirname(relativeFilePath));
      const tmpFileName = path.join(heicTmpDir, 'h' + outputImgFileName);
      await shFiles.ensureDir(path.dirname(tmpFileName));
      await thumbnailer.convertHeicToJpg(sourceFileName, tmpFileName);
      sourceFileName = tmpFileName;
    }
    thumbnailer
      .generateThumbnail(sourceFileName, outputFileName, width, data.height, data.keepAspec)
      .then(() => { done(); }, done);
  });
};

export default {
  init
};
