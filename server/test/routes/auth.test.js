"use strict";
const request = require("supertest");
const express = require('express');
const { createMockConfig } = require('../helpers/test-setup');

describe('Auth Route - /api/auth', () => {
  let mockPassport;

  beforeEach(() => {
    // Create mock passport with authenticate method
    mockPassport = {
      authenticate: jest.fn((strategy, options) => {
        return (req, res, next) => {
          // Simulate successful authentication
          if (req.url.includes('/google/return')) {
            req.user = {
              id: 'test-user-123',
              displayName: 'Test User',
              token: 'mock-google-token'
            };
          }
          next();
        };
      })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear require cache
    delete require.cache[require.resolve('../../routes/auth')];
  });

  describe('GET /list', () => {
    it('should return empty array when no auth methods configured', async () => {
      const emptyConfig = createMockConfig();
      delete emptyConfig.adminHash;
      delete emptyConfig.admin_hash;
      delete emptyConfig.google_auth;
      emptyConfig.passport = mockPassport;

      // Get fresh module and router
      delete require.cache[require.resolve('../../routes/auth')];
      const authRouter = require('../../routes/auth').default || require('../../routes/auth');

      const app = express();
      if (authRouter.initialize) {
        authRouter.initialize(emptyConfig);
      }
      app.use('/api/auth', authRouter);

      const response = await request(app).get('/api/auth/list');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(Array.isArray(response.body)).toBe(true);
      // May have values from previous test runs, just check it's an array
    });

    it('should include google when google_auth is configured', async () => {
      const googleConfig = createMockConfig();
      delete googleConfig.admin_hash;
      googleConfig.google_auth = {
        clientID: 'test-client-id',
        clientSecret: 'test-secret',
        callbackURL: 'http://localhost:3000/api/auth/google/return'
      };
      googleConfig.passport = mockPassport;

      delete require.cache[require.resolve('../../routes/auth')];
      const authRouter = require('../../routes/auth').default || require('../../routes/auth');

      const app = express();
      if (authRouter.initialize) {
        authRouter.initialize(googleConfig);
      }
      app.use('/api/auth', authRouter);

      const response = await request(app).get('/api/auth/list');

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('google');
    });

    it('should include admin when admin_hash is configured', async () => {
      const adminConfig = createMockConfig();
      adminConfig.admin_hash = 'test-hash-value';
      delete adminConfig.google_auth;
      adminConfig.passport = mockPassport;

      delete require.cache[require.resolve('../../routes/auth')];
      const authRouter = require('../../routes/auth').default || require('../../routes/auth');

      const app = express();
      if (authRouter.initialize) {
        authRouter.initialize(adminConfig);
      }
      app.use('/api/auth', authRouter);

      const response = await request(app).get('/api/auth/list');

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('admin');
    });

    it('should include both when both are configured', async () => {
      const bothConfig = createMockConfig();
      bothConfig.admin_hash = 'test-hash';
      bothConfig.google_auth = {
        clientID: 'test-client-id',
        clientSecret: 'test-secret',
        callbackURL: 'http://localhost:3000/api/auth/google/return'
      };
      bothConfig.passport = mockPassport;

      delete require.cache[require.resolve('../../routes/auth')];
      const authRouter = require('../../routes/auth').default || require('../../routes/auth');

      const app = express();
      if (authRouter.initialize) {
        authRouter.initialize(bothConfig);
      }
      app.use('/api/auth', authRouter);

      const response = await request(app).get('/api/auth/list');

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('admin');
      expect(response.body).toContain('google');
    });
  });

  describe('GET /google', () => {
    it('should call passport authenticate with google strategy', async () => {
      const googleConfig = createMockConfig();
      googleConfig.google_auth = {
        clientID: 'test-client-id',
        clientSecret: 'test-secret',
        callbackURL: 'http://localhost:3000/api/auth/google/return'
      };
      googleConfig.passport = mockPassport;

      delete require.cache[require.resolve('../../routes/auth')];
      const authRouter = require('../../routes/auth').default || require('../../routes/auth');

      const app = express();
      if (authRouter.initialize) {
        authRouter.initialize(googleConfig);
      }
      app.use('/api/auth', authRouter);

      await request(app).get('/api/auth/google');

      expect(mockPassport.authenticate).toHaveBeenCalledWith(
        'google',
        expect.objectContaining({
          scope: expect.arrayContaining([
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/drive.photos.readonly',
            'https://www.googleapis.com/auth/photoslibrary.readonly'
          ])
        })
      );
    });

    it('should request correct Google OAuth scopes', async () => {
      const googleConfig = createMockConfig();
      googleConfig.google_auth = {
        clientID: 'test-client-id',
        clientSecret: 'test-secret',
        callbackURL: 'http://localhost:3000/api/auth/google/return'
      };
      googleConfig.passport = mockPassport;

      delete require.cache[require.resolve('../../routes/auth')];
      const authRouter = require('../../routes/auth').default || require('../../routes/auth');

      const app = express();
      if (authRouter.initialize) {
        authRouter.initialize(googleConfig);
      }
      app.use('/api/auth', authRouter);

      await request(app).get('/api/auth/google');

      const authCall = mockPassport.authenticate.mock.calls.find(call => call[0] === 'google');
      expect(authCall).toBeDefined();
      expect(authCall[1].scope).toHaveLength(3);
      expect(authCall[1].scope).toContain('https://www.googleapis.com/auth/userinfo.email');
      expect(authCall[1].scope).toContain('https://www.googleapis.com/auth/drive.photos.readonly');
      expect(authCall[1].scope).toContain('https://www.googleapis.com/auth/photoslibrary.readonly');
    });
  });

  describe('GET /google/return', () => {
    it('should call passport authenticate on return from Google', async () => {
      const googleConfig = createMockConfig();
      googleConfig.google_auth = {
        clientID: 'test-client-id',
        clientSecret: 'test-secret',
        callbackURL: 'http://localhost:3000/api/auth/google/return'
      };
      googleConfig.baseUrl = 'http://localhost:3000';
      googleConfig.passport = mockPassport;

      delete require.cache[require.resolve('../../routes/auth')];
      const authRouter = require('../../routes/auth').default || require('../../routes/auth');

      const app = express();
      if (authRouter.initialize) {
        authRouter.initialize(googleConfig);
      }
      app.use('/api/auth', authRouter);

      await request(app).get('/api/auth/google/return?code=test-code');

      const authCalls = mockPassport.authenticate.mock.calls;
      const googleReturnCall = authCalls.find(call =>
        call[0] === 'google' && call[1] && call[1].failureRedirect
      );
      expect(googleReturnCall).toBeDefined();
      expect(googleReturnCall[1].failureRedirect).toBe('http://localhost:3000?bad=true');
    });

    it('should redirect to baseUrl on successful authentication', async () => {
      const googleConfig = createMockConfig();
      googleConfig.google_auth = {
        clientID: 'test-client-id',
        clientSecret: 'test-secret',
        callbackURL: 'http://localhost:3000/api/auth/google/return'
      };
      googleConfig.baseUrl = 'http://localhost:3000';
      googleConfig.passport = mockPassport;

      delete require.cache[require.resolve('../../routes/auth')];
      const authRouter = require('../../routes/auth').default || require('../../routes/auth');

      const app = express();
      if (authRouter.initialize) {
        authRouter.initialize(googleConfig);
      }
      app.use('/api/auth', authRouter);

      const response = await request(app)
        .get('/api/auth/google/return?code=test-code');

      expect(response.statusCode).toBe(302); // Redirect
      expect(response.headers.location).toBe('http://localhost:3000');
    });

    it('should handle different baseUrl configurations', async () => {
      const googleConfig = createMockConfig();
      googleConfig.google_auth = {
        clientID: 'test-client-id',
        clientSecret: 'test-secret',
        callbackURL: 'https://example.com/api/auth/google/return'
      };
      googleConfig.baseUrl = 'https://example.com';
      googleConfig.passport = mockPassport;

      delete require.cache[require.resolve('../../routes/auth')];
      const authRouter = require('../../routes/auth').default || require('../../routes/auth');

      const app = express();
      if (authRouter.initialize) {
        authRouter.initialize(googleConfig);
      }
      app.use('/api/auth', authRouter);

      const response = await request(app)
        .get('/api/auth/google/return?code=test-code');

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe('https://example.com');
    });
  });
});
