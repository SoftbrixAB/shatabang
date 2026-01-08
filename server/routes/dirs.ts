import * as express from 'express';
import * as path from 'path';
const router: express.Router = express.Router();
const shFiles = require('../common/shatabang_files');

let cacheDir: string;
let infoDirectory: string;

(router as any).initialize = function(config: any) {
  cacheDir = config.cacheDir;
  infoDirectory = path.join(cacheDir, 'info');
};

router.get('/list', function(req, res) {
  shFiles.listSubDirs(infoDirectory, function(error: Error | null, directories: string[]) {
    if (error) {
      console.log(error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end("Error loading directories." + JSON.stringify(error));
    }
    res.setHeader('content-type', 'application/json');
    res.send(directories).status(200);
  });
});

export default router;
