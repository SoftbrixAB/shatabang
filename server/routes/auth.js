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
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
const router = express.Router();
let auth_methods = [];
let passport;
let baseUrl;
function isEmpty(s) {
    return s !== undefined && typeof s === 'string' && s.length > 0;
}
router.initialize = function (config) {
    [{ conf: 'admin_hash', name: 'admin' },
        { conf: 'google_auth', name: 'google' }]
        .forEach(function (e) {
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
    router.get('/google', passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/drive.photos.readonly',
            'https://www.googleapis.com/auth/photoslibrary.readonly'
            /*'https://www.googleapis.com/auth/plus.media.upload'*/ 
        ]
    }));
    // Google will redirect the user to this URL after authentication.  Finish
    // the process by verifying the assertion.  If valid, the user will be
    // logged in.  Otherwise, authentication has failed.
    router.get('/google/return', passport.authenticate('google', { failureRedirect: baseUrl + '?bad=true' }), function (req, res) {
        console.log(req.query.code);
        console.log(req.user.token);
        // Successful authentication, redirect home.
        res.redirect(baseUrl);
    });
};
router.get('/list', function (req, res) {
    res.setHeader('content-type', 'application/json');
    res.send(auth_methods).status(200);
});
exports.default = router;
//# sourceMappingURL=auth.js.map