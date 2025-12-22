import * as express from 'express';
const router: express.Router = express.Router();

let auth_methods: string[] = [];
let passport: any;
let baseUrl: string;

function isEmpty(s: any): boolean {
  return s !== undefined && typeof s === 'string' && s.length > 0;
}

(router as any).initialize = function(config: any) {
  [{ conf: 'admin_hash', name: 'admin' },
   { conf: 'google_auth', name: 'google' }]
    .forEach(function(e) {
      if (!isEmpty(config[e.conf])) {
        auth_methods.push(e.name);
      }
    });
  passport = config.passport;
  baseUrl = config.baseUrl;

  console.log('baseUrl', baseUrl);

  // Redirect the user to Google for authentication.  When complete, Google
  // will redirect the user back to the application at
  //     /api/auth/google/return configured in the config_server.json
  router.get('/google', passport.authenticate('google',
    {
      scope: ['https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/drive.photos.readonly',
        'https://www.googleapis.com/auth/photoslibrary.readonly'
        /*'https://www.googleapis.com/auth/plus.media.upload'*/]
    }));

  // Google will redirect the user to this URL after authentication.  Finish
  // the process by verifying the assertion.  If valid, the user will be
  // logged in.  Otherwise, authentication has failed.
  router.get('/google/return',
    passport.authenticate('google', { failureRedirect: baseUrl + '?bad=true' }),
    function(req: any, res) {
      console.log(req.query.code);
      console.log(req.user.token);

      // Successful authentication, redirect home.
      res.redirect(baseUrl);
    });
};

router.get('/list', function(req, res) {
  res.setHeader('content-type', 'application/json');
  res.send(auth_methods).status(200);
});

export default router;
