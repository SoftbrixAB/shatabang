import * as path from 'path';
const Face = require('../common/models/face');
const shFiles = require('../common/shatabang_files');
import shFra from '../modules/shatabang_fra';

interface Config {
  cacheDir: string;
}

interface TaskQueue {
  registerTaskProcessor(taskName: string, processor: (data: any, job: any, done: (err?: any) => void) => void): void;
}

/** Part one of detecting faces in images **/
const init = function(config: Config, task_queue: TaskQueue): void {
  const cacheDir = config.cacheDir;

  task_queue.registerTaskProcessor('faces_crop', function(data, job, done) {
    const relativeFilePath = data.file;
    const sourceFileName = path.resolve(path.join(cacheDir, "1920", relativeFilePath));

    if (!shFiles.exists(sourceFileName)) {
      return done('Missing file:' + sourceFileName);
    }

    const face = data.faceInfo;

    // Save the buffer and store the new index to the face info
    return shFra.cropFace(sourceFileName, face)
      .then(async (buffer) => {
        await Face.findByIdAndUpdate(face.id, { "buffer": buffer });
        return buffer;
      })
      .then(shFra.imageBlurValue)
      .then(function(sharpness) {
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

export default {
  init
};
