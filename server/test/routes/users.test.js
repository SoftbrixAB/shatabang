"use strict";
const request = require("supertest");
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { createMockConfig, createAuthenticatedUser } = require('../helpers/test-setup');

describe('Users Route - /api/users', () => {
  let app;
  let config;
  let usersRouter;
  let mockPassport;

  beforeEach(() => {
    // Create mock passport
    mockPassport = {
      authenticate: jest.fn((strategy) => {
        return (req, res, next) => {
          if (strategy === 'local') {
            // Simulate successful local authentication
            req.user = {
              username: 'testuser',
              displayName: 'Test User',
              id: 'user-123'
            };
          }
          next();
        };
      }),
      initialize: () => (req, res, next) => next(),
      session: () => (req, res, next) => next(),
      serializeUser: (fn) => {},
      deserializeUser: (fn) => {}
    };

    config = createMockConfig();
    config.passport = mockPassport;

    // Clear module cache to get fresh router
    jest.resetModules();
    usersRouter = require('../../routes/users').default || require('../../routes/users');

    app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));

    // Session middleware for auth tests
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }
    }));

    app.use(mockPassport.initialize());
    app.use(mockPassport.session());

    // Add logout method to all requests
    app.use((req, res, next) => {
      req.logout = function(callback) {
        delete req.user;
        delete req.session.passport;
        if (callback) callback();
      };
      next();
    });

    if (usersRouter.initialize) {
      usersRouter.initialize(config);
    }

    app.use('/api/users', usersRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /authenticate', () => {
    it('should authenticate user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/authenticate')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.statusCode).toBe(200);
      expect(mockPassport.authenticate).toHaveBeenCalledWith('local');
    });

    it('should call passport local strategy', async () => {
      await request(app)
        .post('/api/users/authenticate')
        .send({ username: 'user', password: 'pass' });

      expect(mockPassport.authenticate).toHaveBeenCalledWith('local');
    });

    it('should handle authentication failure', async () => {
      // Create a fresh app with failing authentication mock
      const failPassport = {
        authenticate: jest.fn((strategy) => {
          return (req, res, next) => {
            res.status(401).send('Authentication failed');
          };
        }),
        initialize: () => (req, res, next) => next(),
        session: () => (req, res, next) => next()
      };

      const failConfig = createMockConfig();
      failConfig.passport = failPassport;

      delete require.cache[require.resolve('../../routes/users')];
      const failRouter = require('../../routes/users').default || require('../../routes/users');

      const failApp = express();
      failApp.use(bodyParser.json());
      failApp.use(bodyParser.urlencoded({ extended: false }));
      failApp.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
      }));
      failApp.use(failPassport.initialize());
      failApp.use(failPassport.session());
      failApp.use((req, res, next) => {
        req.logout = function(callback) {
          delete req.user;
          delete req.session.passport;
          if (callback) callback();
        };
        next();
      });

      if (failRouter.initialize) {
        failRouter.initialize(failConfig);
      }
      failApp.use('/api/users', failRouter);

      const response = await request(failApp)
        .post('/api/users/authenticate')
        .send({ username: 'wronguser', password: 'wrongpass' });

      expect(response.statusCode).toBe(401);
      expect(response.text).toContain('Authentication failed');
    });

    it('should handle urlencoded form data', async () => {
      const response = await request(app)
        .post('/api/users/authenticate')
        .type('form')
        .send('username=testuser&password=password123');

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /invalidate', () => {
    it('should logout user and redirect to home', async () => {
      const response = await request(app)
        .post('/api/users/invalidate');

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe('/');
    });

    it('should redirect even when not logged in', async () => {
      const response = await request(app)
        .post('/api/users/invalidate');

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe('/');
    });
  });

  describe('GET /me', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app).get('/api/users/me');

      expect(response.statusCode).toBe(401);
      expect(response.text).toContain('Unauthorized');
    });

    it('should return 401 when session is missing', async () => {
      // Create app without session middleware
      const noSessionApp = express();
      noSessionApp.use(bodyParser.json());

      if (usersRouter.initialize) {
        usersRouter.initialize(config);
      }

      noSessionApp.use('/api/users', usersRouter);

      const response = await request(noSessionApp).get('/api/users/me');

      expect(response.statusCode).toBe(401);
      expect(response.text).toContain('Unauthorized');
    });

    it('should return user info when authenticated', async () => {
      const authenticatedUser = createAuthenticatedUser();

      // Add middleware to simulate authenticated user
      app.use((req, res, next) => {
        req.user = authenticatedUser;
        if (!req.session.views) {
          req.session.views = 0;
        }
        next();
      });

      // Re-add users router after auth middleware
      const freshRouter = require('../../routes/users').default || require('../../routes/users');
      app.use('/api/users-auth', freshRouter);

      const response = await request(app).get('/api/users-auth/me');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.type).toBe('user');
      expect(response.body.data.id).toBe('me');
      expect(response.body.data.attributes.username).toBe(authenticatedUser.username);
      expect(response.body.data.attributes.user).toEqual(authenticatedUser);
    });

    it('should increment session views counter', async () => {
      const authenticatedUser = createAuthenticatedUser();
      let sessionViews = 0;

      // Add middleware to simulate authenticated user and track views
      app.use((req, res, next) => {
        req.user = authenticatedUser;
        req.session.views = sessionViews;

        // Capture the updated views value
        const originalEnd = res.end;
        res.end = function(...args) {
          sessionViews = req.session.views;
          originalEnd.apply(res, args);
        };

        next();
      });

      // Re-add users router
      const freshRouter = require('../../routes/users').default || require('../../routes/users');
      app.use('/api/users-views', freshRouter);

      // First request
      await request(app).get('/api/users-views/me');
      expect(sessionViews).toBe(1);

      // Second request
      await request(app).get('/api/users-views/me');
      expect(sessionViews).toBe(2);

      // Third request
      await request(app).get('/api/users-views/me');
      expect(sessionViews).toBe(3);
    });

    it('should return JSON in correct format', async () => {
      const authenticatedUser = createAuthenticatedUser({
        username: 'johndoe',
        displayName: 'John Doe',
        id: 'user-456'
      });

      // Add middleware to simulate authenticated user
      app.use((req, res, next) => {
        req.user = authenticatedUser;
        if (!req.session.views) {
          req.session.views = 0;
        }
        next();
      });

      // Re-add users router
      const freshRouter = require('../../routes/users').default || require('../../routes/users');
      app.use('/api/users-format', freshRouter);

      const response = await request(app).get('/api/users-format/me');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);

      // Verify JSON structure
      expect(response.body).toMatchObject({
        data: {
          type: 'user',
          id: 'me',
          attributes: {
            username: 'johndoe',
            user: expect.objectContaining({
              username: 'johndoe',
              displayName: 'John Doe',
              id: 'user-456'
            })
          }
        }
      });
    });

    it('should handle user with minimal information', async () => {
      const minimalUser = {
        username: 'minimal'
      };

      // Add middleware to simulate authenticated user
      app.use((req, res, next) => {
        req.user = minimalUser;
        if (!req.session.views) {
          req.session.views = 0;
        }
        next();
      });

      // Re-add users router
      const freshRouter = require('../../routes/users').default || require('../../routes/users');
      app.use('/api/users-minimal', freshRouter);

      const response = await request(app).get('/api/users-minimal/me');

      expect(response.statusCode).toBe(200);
      expect(response.body.data.attributes.username).toBe('minimal');
    });
  });
});
