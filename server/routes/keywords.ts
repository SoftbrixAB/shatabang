import * as express from 'express';
const router: express.Router = express.Router();
const indexes = require("../common/indexes");

let index: any;

(router as any).initialize = function(config: any) {
  index = indexes.keywordsIndex(config.redisClient);
};

router.get('/', function(req, res) {
  index.keys().then((keys: string[]) => {
    res.end(JSON.stringify({ keywords: keys }));
  })
    .catch((err: Error) => {
      res.status(500).end(err);
    });
});

router.get('/:id', function(req, res) {
  index.get(req.params.id)
    .then(
      (values: any) => res.end(JSON.stringify({ keyword: values })),
      (err: Error) => res.status(500).end(err)
    );
});

export default router;
