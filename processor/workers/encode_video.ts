import * as path from 'path';
import * as os from 'os';
const ffmpeg = require('fluent-ffmpeg');
const shFiles = require('../common/shatabang_files');

// Old video formats needs to be reencoded to be supported by the browsers
// So we do this for all the videos
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const CPU_CORES = os.cpus();
const CORES_TO_USE = Math.max(1, CPU_CORES.length - 1);

export default async function(job: any, done: (err?: any) => void): Promise<void> {
  const data = job.data;
  const storageDir = data.storageDir;
  const cacheDir = data.cacheDir;
  const width = data.width || MAX_WIDTH;
  const height = data.height || MAX_HEIGHT;
  const file = path.parse(data.file);

  const outputFileName = path.join(cacheDir, '' + width, file.dir, file.name + '.mp4');
  const sourceFileName = path.join(storageDir, file.dir, file.base);

  job.log('Source: ' + sourceFileName);
  job.log('Dest: ' + outputFileName);

  if (!data.forceUpdate && shFiles.exists(outputFileName)) {
    job.log('Video already exists: ' + outputFileName);
    return done();
  }

  const encodeFileName = path.join(cacheDir, 'encoding', '' + width, file.dir, file.name + '.mp4');
  await shFiles.ensureDir(path.dirname(encodeFileName));

  ffmpeg(sourceFileName, { logger: console })
    .videoCodec('libx264')
    .audioCodec('aac')
    .outputOptions([
      // Tell ffmpg to not print video information
      '-hide_banner',
      // Move information to the beginning of the file and allow playing before it's completly downloaded
      '-movflags faststart',
      // Be compatible with the html5 player
      '-pix_fmt yuv420p',
      // Better compression to speed ratio
      // '-preset slowest',
      '-crf 28',
      // Run on almost all cores
      '-threads ' + CORES_TO_USE,
      // Limit image size to 1920x1080
      // '-vf scale=w='+width+':h='+height+':force_original_aspect_ratio=decrease'
    ])
    .size(`${width}x${height}`)
    .keepDisplayAspectRatio()
    .on('error', function(err: Error) {
      job.log('Error encoding file', err);
      done(err);
    })
    .on('progress', function(progress: any) {
      job.progress(progress.percent);
    })
    .on('end', async function() {
      try {
        await shFiles.ensureDir(path.dirname(outputFileName));
        await shFiles.moveFile(encodeFileName, outputFileName);
        job.progress(100);
        done();
      } catch (err) {
        job.log('Error moving file', err);
        done(err);
      }
    })
    .on('start', function(commandLine: string) {
      job.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .save(encodeFileName);
}
