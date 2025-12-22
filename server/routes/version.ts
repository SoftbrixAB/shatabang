import * as express from 'express';
const router: express.Router = express.Router();

// Read version from package.json
const version = require('../package.json').version;

(router as any).initialize = function() {
};

router.get('/', function(req, res) {
  res.send(version).end();
});

export default router;
