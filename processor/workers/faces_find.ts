import * as path from 'path';
const Face = require('../common/models/face');
const shFiles = require('../common/shatabang_files');
import shFra from '../modules/shatabang_fra';
import fileType from '../modules/file_type_regexp';

const THRESHOLD = Number(process.env.SH_FACE_THRESHOLD) || 34000;

interface Config {
  cacheDir: string;
}

interface TaskQueue {
  registerTaskProcessor(taskName: string, processor: (data: any, job: any, done: (err?: any) => void) => void): void;
  queueTask(taskName: string, data: any): void;
}

/** Part one of detecting faces in images **/
const init = async function(config: Config, task_queue: TaskQueue): Promise<void> {
  const cacheDir = config.cacheDir;
  await shFra.initModel();

  task_queue.registerTaskProcessor('faces_find', function(data, job, done) {
    const relativeFilePath = fileType.toCacheImageFileName(data.file);
    const sourceFileName = path.resolve(path.join(cacheDir, "960", relativeFilePath));

    if (!shFiles.exists(sourceFileName)) {
      job.log('Missing file:' + sourceFileName);
      return done('Missing file:' + sourceFileName);
    }

    shFra.findFaces(sourceFileName).then(function(faces) {
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
        (face as any).id = newFace._id;

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

export default {
  init
};
