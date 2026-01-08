import * as bodyParser from 'body-parser';
import * as express from 'express';
const router: express.Router = express.Router();

let passport: any;

(router as any).initialize = function(config: any) {
  passport = config.passport;

  router.post('/authenticate',
    passport.authenticate('local'),
    function(req, res) {
      res.status(200);
      res.end();
    }
  );
};

router.use('/authenticate', bodyParser.urlencoded({ extended: true }));

router.post('/invalidate', function(req: any, res) {
  req.logout();
  res.redirect('/');
});

router.get('/me', function(req: any, res) {
  const sess = req.session;
  if (sess === undefined || req.user === undefined) {
    // The client is missing a session, return unauthorized response
    res.status(401).send('Unauthorized');
    return false;
  }
  if (!sess.views) {
    sess.views = 0;
  }
  sess.views++;
  res.json({
    "data": {
      "type": "user",
      "id": "me",
      "attributes": {
        'username': req.user.username,
        'user': req.user
      }
    }
  }).end();
});

export default router;
