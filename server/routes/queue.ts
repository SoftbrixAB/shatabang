import * as express from 'express';
import * as bodyParser from 'body-parser';
const task_queue = require('../common/task_queue');
const router: express.Router = express.Router();

/**
 * This route manages the kue apis
 */
let cacheDir: string;

(router as any).initialize = function(config: any) {
  cacheDir = config.cacheDir;
};

router.use('/*', bodyParser.urlencoded({ extended: true }));

const getQueueStatus = function(req: express.Request, res: express.Response) {
  const queueName = req.params.queue;
  let selectedNames: string[];
  if (queueName !== undefined) {
    selectedNames = [queueName];
  } else {
    selectedNames = task_queue.names();
  }

  return Promise.all(selectedNames.map(qName => task_queue.getJobCounts(qName)))
    .then(stats => {
      res.end(JSON.stringify(selectedNames.reduce(function(result: any, field, index) {
        result[field] = stats[index];
        return result;
      }, {})));
    });
};

router.get('/status', getQueueStatus);
router.get('/status/:queue', getQueueStatus);

router.post('/add/:name/:priority/', function(req, res) {
  const id = req.params.name;
  const priority = req.params.priority;
  const params = req.body || {};

  res.end("id: " + id + ", priority: " + priority);
  task_queue.queueTask(id, params, priority);
});

router.post('/addFolder/:folder/:name/:priority/', function(req, res) {
  const id = req.params.name;
  const priority = req.params.priority;
  const params = {
    dir: req.params.folder,
    params: req.body || {},
    task_name: id,
    priority: priority
  };
  // TODO: Verify that year exists, or else return a http error
  console.log('The id: ' + id);
  res.end("id: " + id + ", priority: " + priority);

  task_queue.queueTask('run_task_in_folder', params, priority);
});

export default router;
