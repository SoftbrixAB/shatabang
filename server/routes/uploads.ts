import * as express from 'express';
const shFiles = require('../common/shatabang_files');
import ImportLog from '../common/import_log';
const router: express.Router = express.Router();
const multer = require('multer');

let uploadDir: string;
let importDir: string;
let importLog: any;

(router as any).initialize = function(config: any) {
  uploadDir = config.uploadDir;
  importDir = config.importDir;
  importLog = new ImportLog(config.cacheDir);
};

const partPrefix = 'part-';

const storage = multer.diskStorage({
  destination: function(req: any, file: any, callback: (err: Error | null, destination: string) => void) {
    callback(null, uploadDir);
  },
  filename: function(req: any, file: any, callback: (err: Error | null, filename: string) => void) {
    const filename = partPrefix + Date.now() + '-' + file.originalname;
    console.log('Uploading: ', filename);
    callback(null, filename);
  }
});

const uploadSingle = multer({ storage: storage }).single('file');
const uploadMultiple = multer({ storage: storage }).array('files', 999);

router.post('/single', function(req: any, res) {
  uploadSingle(req, res, function(err: Error | null) {
    if (err) {
      console.log(err);
      return res.status(500).end("Error uploading file.");
    }
    const file = req.file;
    shFiles.moveFile(file.path, importDir + '/' + file.filename.substr(partPrefix.length));
    console.log('Uploading done', file.filename);
    res.end("OK");
  });
});

router.post('/multiple', function(req: any, res) {
  uploadMultiple(req, res, function(err: Error | null) {
    if (err) {
      console.log(err);
      return res.status(500).end("Error uploading files.");
    }
    res.end("OK");
  });
});

const importedRoute = function(req: any, res: express.Response) {
  const lastId = req.params.lastId || 0;
  const lastTimeStamp = importLog.lastTimestamp();
  if (lastTimeStamp) {
    const lastModifiedDate = new Date();
    lastModifiedDate.setTime(lastTimeStamp);
    res.setHeader('Last-Modified', lastModifiedDate.toUTCString());
  }
  const response = JSON.stringify(importLog.tail(lastId));
  res.send(response.replace(/"/g, ''));
};

router.get('/imported/:lastId', importedRoute);
router.get('/imported', importedRoute);

export default router;
