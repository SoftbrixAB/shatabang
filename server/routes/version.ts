import * as express from 'express';
import { VERSION } from './version-info';

const router: express.Router = express.Router();

(router as any).initialize = function() {
};

router.get('/', function(req, res) {
  res.send(VERSION).end();
});

export default router;
