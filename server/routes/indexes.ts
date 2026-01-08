import * as bodyParser from 'body-parser';
import * as express from 'express';
const router: express.Router = express.Router();
const indexes = require('../common/indexes');

(router as any).initialize = function(config: any) {
  router.get('/sha/keys', getKeys(indexes.fileShaIndex(config.cacheDir)));
  router.get('/fingers/keys', getKeys(indexes.imgFingerIndex(config.cacheDir)));
  router.get('/rating/keys', getKeys(indexes.ratingIndex(config.cacheDir)));

  router.post('/rating/add', function(req, res) {
    const file = req.body.file;
    const rating = req.body.rating;
    if (!file || !rating) {
      res.status(400).send("Missing required parameters, file and/or rating").end();
      return;
    }
    if (rating < 0 || rating > 1) {
      res.status(400).send("Rating should be between 0 and 1").end();
      return;
    }
    const idx = indexes.ratingIndex(config.cacheDir);
    idx.put(file, rating);
    res.end();
  });

  router.use('/rating/add', bodyParser.urlencoded({ extended: true }));
};

const getKeys = function(idx: any) {
  return function(req: express.Request, res: express.Response) {
    res.setHeader('content-type', 'application/json');
    res.json(idx.keys()).end();
  };
};

export default router;
