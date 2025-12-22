import * as path from 'path';
import * as express from 'express';
const router: express.Router = express.Router();
const indexes = require('../common/indexes');
const shFiles = require('../common/shatabang_files');
const task_queue = require('../common/task_queue');

let sourceDir: string;
let cacheDir: string;
let deletedDir: string;
let timesIndex: any;
let apiEndpoint: string;

(router as any).initialize = function(config: any) {
  sourceDir = config.storageDir;
  cacheDir = config.cacheDir;
  deletedDir = config.deletedDir;
  timesIndex = indexes.importedTimesIndex(config.cacheDir);
  apiEndpoint = 'https://photoslibrary.googleapis.com';
};

router.post('/delete', function(req, res) {
  if (!req.body.length) {
    res.send("Missing post data").status(400);
    return;
  }

  req.body.forEach(function(reference: string) {
    const sourceFile = path.join(sourceDir, reference);
    const destFile = path.join(deletedDir, path.basename(reference));
    const cache300 = path.join(cacheDir, '300', reference);
    const cache1920 = path.join(cacheDir, '1920', reference);

    shFiles.moveFile(sourceFile, destFile)
      .then(console.log, function(error: Error) {
        console.log('Error:', error);
      });
    shFiles.deleteFile(cache300);
    shFiles.deleteFile(cache1920);

    const elem = Object.entries(timesIndex.toJSON()).find(([key, value]: [string, any]) => value && value.indexOf && value.indexOf(reference) > -1);
    if (elem != undefined) {
      timesIndex.delete(elem[0]);
    }

    const directory = reference.split(path.sep)[0];
    task_queue.queueTask('update_directory_list', { title: directory, dir: directory }, 'high');
  });

  res.send("OK").status(200);
});

router.get('/listgoo', async (req: any, res) => {
  let photos: any[] = [];
  try {
    let parameters: any = {
      pageSize: 100
    };
    const photosToLoad = req.query.l || 200;
    res.write("[");

    do {
      console.log(
        `Submitting search with parameters: ${JSON.stringify(parameters)}`);

      // Make a POST request to search the library or album
      const result: any =
        await fetch(apiEndpoint + '/v1/mediaItems:search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${req.user.token}`
          },
          body: JSON.stringify(parameters),
        });

      // Set the pageToken for the next request.
      parameters.pageToken = result.nextPageToken;

      // The list of media items returned may be sparse and contain missing
      // elements. Remove all invalid elements.
      // Also remove all elements that are not images by checking its mime type.
      // Media type filters can't be applied if an album is loaded, so an extra
      // filter step is required here to ensure that only images are returned.
      const items = result && result.mediaItems ?
        result.mediaItems
          .filter((x: any) => x)  // Filter empty or invalid items.
          // Only keep media items with an image mime type.
          // .filter(x => x.mimeType && x.mimeType.startsWith('image/'))
        : [];

      for (let i = 0; i < items.length - 1; i++) {
        res.write(JSON.stringify(items[i]) + ',');
      }

      photos = photos.concat(items);
      console.log(photos.length);

    } while (photos.length < photosToLoad &&
      parameters.pageToken != null);
    res.write("'']"); //array ending bracket
    res.end();
    shFiles.writeFile("./photo_data.json", JSON.stringify(photos));
  } catch (err) {
    console.log("error", err);
    res.send((err as Error).message);
  }
});

export default router;
