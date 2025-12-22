import * as express from 'express';
const router: express.Router = express.Router();
const indexes = require('../common/indexes');

let cacheDir: string;

(router as any).initialize = function(config: any) {
  cacheDir = config.cacheDir;
};

router.get('/list', function(req, res) {
  const idx = indexes.imgFingerIndex(cacheDir);
  let written = false;
  res.setHeader('content-type', 'application/json');
  res.write("[");
  idx.keys().forEach(function(key: string) {
    const items = idx.get(key);
    if (items.length > 1) {
      if (written) {
        res.write(',');
      }
      written = true;
      res.write(JSON.stringify({
        key: key,
        items: items
      }));
    }
  });
  res.end("]");
});

export default router;
