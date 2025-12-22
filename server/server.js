"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./common/config"));
const directories = __importStar(require("./common/directories"));
const task_queue = require('./common/task_queue');
const Bull = require('bull');
const Arena = require('bull-arena');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const express = require("express");
const bodyParser = require("body-parser");
const compression = require("compression");
const session = require("express-session");
const sha256 = require('sha256');
const url = __importStar(require("url"));
const RedisStore = require('connect-redis').default;
const redis = __importStar(require("redis"));
const app = express();
const path = __importStar(require("path"));
const passport = __importStar(require("passport"));
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
// API Access link for creating client ID and secret:
// https://code.google.com/apis/console/
if (process.env.GOOGLE_AUTH) {
    console.log('ENV variable overwriting the google auth configuration');
    const envConf = process.env.GOOGLE_AUTH.split(':');
    config_1.default.google_auth = {
        "clientID": envConf[0],
        "clientSecret": envConf[1],
        "callbackURL": config_1.default.baseUrl,
        "allowed_ids": process.env.GOOGLE_AUTH_ALLOW.split(',')
    };
}
console.log('Starting the server with the following configuration', config_1.default);
const baseUrlPath = url.parse(config_1.default.baseUrl, true).pathname;
// Initialize the default redis client
const redisClient = redis.createClient({
    socket: {
        host: config_1.default.redisHost,
        port: config_1.default.redisPort
    }
});
redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
});
// Connect to Redis and start server
redisClient.connect().then(() => {
    console.log('Redis client connected');
    config_1.default.redisClient = redisClient;
    task_queue.connect(Object.assign(config_1.default, { createIfMissing: true }));
    // Check that directories exists
    directories.populatesDirectories(config_1.default);
    directories.checkDirectories(config_1.default);
    startServer();
}).catch((err) => {
    console.error('Failed to connect to Redis:', err);
    process.exit(1);
});
function startServer() {
    const routes = [];
    routes.push({ path: 'upload', route: require('./routes/uploads').default });
    routes.push({ path: 'images', route: require('./routes/images').default });
    routes.push({ path: 'duplicates', route: require('./routes/duplicates').default });
    routes.push({ path: 'dirs', route: require('./routes/dirs').default });
    routes.push({ path: 'indexes', route: require('./routes/indexes').default });
    routes.push({ path: 'queue', route: require('./routes/queue').default });
    routes.push({ path: 'keywords', route: require('./routes/keywords').default });
    routes.push({ path: 'auth', route: require('./routes/auth').default, public: true });
    routes.push({ path: 'users', route: require('./routes/users').default, public: true });
    routes.push({ path: 'version', route: require('./routes/version').default, public: true });
    passport.serializeUser(function (user, done) {
        // console.log('serializeUser', user.displayName);
        done(null, user);
    });
    passport.deserializeUser(function (obj, done) {
        // console.log('deserializeUser', obj);
        done(null, obj);
    });
    if (config_1.default.google_auth) {
        console.log('Loading google authentication.');
        if (!config_1.default.google_auth.callbackURL.endsWith("return")) {
            if (!config_1.default.google_auth.callbackURL.endsWith("/")) {
                config_1.default.google_auth.callbackURL += "/";
            }
            config_1.default.google_auth.callbackURL += "api/auth/google/return";
        }
        const GOOGLE_ALLOWED_IDS = config_1.default.google_auth.allowed_ids;
        passport.use(new GoogleStrategy(config_1.default.google_auth, function (token, refreshToken, profile, done) {
            if (!profile) {
                done("Missing profile", null);
                return;
            }
            // First test if we have a valid user id
            let allowed = GOOGLE_ALLOWED_IDS.indexOf(profile.id) >= 0;
            // Second iterate the client emails list
            let i = 0;
            const emails = profile.emails;
            if (!allowed && profile.emails) {
                for (; i < emails.length && !allowed; ++i) {
                    allowed = GOOGLE_ALLOWED_IDS.indexOf(emails[i].value) >= 0;
                }
            }
            if (!allowed) {
                // TODO: Display this error in the application
                const user = emails[i] || profile.id;
                done(user + " is not allowed to access this application", null);
                return;
            }
            // Decorate the username field with something from the google object
            profile.username = profile.emails[i];
            // To keep the example simple, the user's Google profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Google account with a user record in your database,
            // and return that user instead.
            return done(null, { profile, token });
        }));
    }
    if (config_1.default.adminHash) {
        console.log('Loading local with admin authentication.');
        passport.use(new LocalStrategy(function (username, password, done) {
            if ("admin" !== username.toLowerCase()) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            const hash = sha256(password + config_1.default.serverSalt);
            if (hash !== config_1.default.adminHash) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, { username: 'admin', displayName: 'admin' });
        }));
    }
    else {
        console.log('No authentication mechanism configured.');
    }
    config_1.default.passport = passport;
    app.use(bodyParser.json());
    app.use(compression());
    app.use(session({
        secret: config_1.default.serverSalt,
        name: 'cookie67',
        resave: false,
        saveUninitialized: true,
        store: new RedisStore({
            client: redisClient,
            ttl: 900
        })
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    const sendIndex = function (req, res) {
        res.sendFile(__dirname + '/client/dist/index.html');
    };
    app.get('/', sendIndex);
    app.get('/login', sendIndex);
    // Simple route middleware to ensure user is authenticated.
    //   Use this route middleware on any resource that needs to be protected.  If
    //   the request is authenticated (typically via a persistent login session),
    //   the request will proceed.  Otherwise, the user will be redirected to the
    //   login page.
    function requireAuthentication(redirectUrl) {
        return (req, res, next) => {
            if (req.isAuthenticated()) {
                return next();
            }
            if (redirectUrl !== undefined) {
                res.redirect(redirectUrl);
            }
            else {
                res.status(401).send('Unauthorized');
            }
        };
    }
    /// End Authentication
    // Secure the api and images path
    app.all('/images/*', requireAuthentication());
    app.all('/media/*', requireAuthentication());
    app.all('/video/*', requireAuthentication());
    app.all('/arena/*', requireAuthentication(baseUrlPath + '/login'));
    app.all('/admin/*', requireAuthentication(baseUrlPath + '/login'));
    // Map the routes
    routes.forEach(function (route) {
        const routePath = '/api/' + route.path;
        if (route.public !== true) {
            app.all(routePath + '/*', requireAuthentication());
        }
        // initialize the route
        route.route.initialize(config_1.default);
        // connect the route
        app.use(routePath, route.route);
    });
    // Images is the route to the cached (resized) images
    app.use('/images', function (req, res, next) {
        req.shOriginalUrl = req.url;
        // replace file ending with .jpg
        req.url = req.url.replace(/\.png|\.jpg|\.jpeg|\.gif|\.bmp|\.tiff|\.webp|\.heic|\.heif/, '.jpg');
        next();
    }, express.static(config_1.default.cacheDir));
    // Media will load the original
    app.use('/media', express.static(config_1.default.storageDir));
    // Video route will first serve the cached movie and fallback to the original
    // file if not found. Images should be loaded from the image dir
    const movieFileRegexp = /(.+)(mp4|m4v|avi|mov|mpe?g)$/gi;
    app.use('/video', function (req, res, next) {
        req.shOriginalUrl = req.url;
        // Look for a transcoded mp4 file in the cache
        req.url = path.join('/1920', req.url.replace(movieFileRegexp, '$1mp4'));
        next();
    }, express.static(path.join(config_1.default.cacheDir)));
    app.use('/video', function (req, res, next) {
        if (req.shOriginalUrl) {
            // Reset the url if we have modified it
            req.url = req.shOriginalUrl;
        }
        next();
    }, express.static(config_1.default.storageDir));
    const arenaRedisConf = {
        port: config_1.default.redisPort,
        host: config_1.default.redisHost,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
    };
    const queueNames = task_queue.names();
    const queConf = {
        hostId: "shatabang",
        prefix: task_queue.prefix,
        redis: arenaRedisConf,
    };
    const arenaConfig = Arena({
        Bull,
        queues: queueNames.map((name) => Object.assign({}, queConf, { name: name })),
    }, {
        basePath: '/',
        disableListen: true // Let express handle the listening.
    });
    const arena = express.Router();
    arena.use(arenaConfig);
    app.use('/arena', (req, res, next) => {
        if (baseUrlPath != '/') {
            req.url = baseUrlPath + `/arena${req.url}`;
        }
        next();
    }, arena);
    // Bull-board route
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queuestat');
    const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
        queues: [],
        serverAdapter: serverAdapter,
    });
    setQueues(queueNames.map((name) => new BullAdapter(new Bull(name, { redis: arenaRedisConf, prefix: task_queue.prefix }))));
    app.use('/admin/queuestat', (req, res, next) => {
        if (baseUrlPath != '/') {
            req.proxyUrl = baseUrlPath + '/admin/queuestat';
        }
        next();
    }, serverAdapter.getRouter());
    app.use('/', express.static(__dirname + "/client/dist/"));
    app.listen(config_1.default.port, function () {
        console.log("Working on port " + config_1.default.port);
    });
} // end startServer()
//# sourceMappingURL=server.js.map