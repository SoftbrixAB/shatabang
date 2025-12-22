"use strict";

/**
 * Test Setup Helpers
 * Provides common test utilities, mocks, and fixtures for route testing
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');

/**
 * Create a test Express app with minimal middleware
 */
function createTestApp(route, config = {}) {
  const app = express();

  // Basic middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  // Session middleware for auth tests
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // Mock passport serialization
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  // Initialize route if it has an initialize method
  if (route.initialize && typeof route.initialize === 'function') {
    route.initialize(config);
  }

  return app;
}

/**
 * Create mock config object
 */
function createMockConfig() {
  return {
    cacheDir: './test/test_data',
    storageDir: './test/test_data',
    uploadDir: './test/test_data/upload',
    importDir: './test/test_data/import',
    deletedDir: './test/test_data/deleted',
    baseUrl: 'http://localhost:3000',
    redisHost: 'localhost',
    redisPort: 6379,
    serverSalt: 'test-salt',
    adminHash: 'test-hash',
    dirs: {
      storage: './test/test_data',
      import: './test/test_data/import',
      upload: './test/test_data/upload',
      cache: './test/test_data',
      filtered: './test/test_data/filtered',
      info: './test/test_data/info',
      deleted: './test/test_data/deleted',
      duplicates: './test/test_data/duplicates',
      unknown: './test/test_data/unknown'
    },
    redisClient: createMockRedisClient(),
    passport: passport,
    google_auth: {
      clientID: 'test-client-id',
      clientSecret: 'test-client-secret',
      callbackURL: 'http://localhost:3000/api/auth/google/return',
      allowed_ids: ['test@example.com']
    }
  };
}

/**
 * Create mock Redis client
 */
function createMockRedisClient() {
  const mockData = new Map();

  return {
    get: jest.fn(async (key) => mockData.get(key) || null),
    set: jest.fn(async (key, value) => { mockData.set(key, value); return 'OK'; }),
    del: jest.fn(async (key) => { mockData.delete(key); return 1; }),
    keys: jest.fn(async (pattern) => {
      const keys = Array.from(mockData.keys());
      if (pattern === '*') return keys;
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return keys.filter(k => regex.test(k));
    }),
    hGet: jest.fn(async (hash, field) => mockData.get(`${hash}:${field}`) || null),
    hSet: jest.fn(async (hash, field, value) => {
      mockData.set(`${hash}:${field}`, value);
      return 1;
    }),
    hGetAll: jest.fn(async (hash) => {
      const result = {};
      for (const [key, value] of mockData.entries()) {
        if (key.startsWith(`${hash}:`)) {
          const field = key.substring(hash.length + 1);
          result[field] = value;
        }
      }
      return result;
    }),
    sAdd: jest.fn(async (key, ...members) => {
      const set = new Set(JSON.parse(mockData.get(key) || '[]'));
      members.forEach(m => set.add(m));
      mockData.set(key, JSON.stringify([...set]));
      return members.length;
    }),
    sMembers: jest.fn(async (key) => {
      return JSON.parse(mockData.get(key) || '[]');
    }),
    quit: jest.fn(async () => 'OK'),
    _mockData: mockData,
    _reset: () => mockData.clear()
  };
}

/**
 * Create mock task queue
 */
function createMockTaskQueue() {
  const queuedTasks = [];

  return {
    queueTask: jest.fn(async (name, data = {}, priority = 'normal') => {
      const task = { name, data, priority, id: Date.now() };
      queuedTasks.push(task);
      return {
        finished: jest.fn(async () => task),
        id: task.id
      };
    }),
    getQueueStatus: jest.fn(async (queueName) => {
      return {
        active: 0,
        waiting: 0,
        completed: 5,
        failed: 0,
        delayed: 0,
        paused: 0
      };
    }),
    clearQueue: jest.fn(async (name) => true),
    _queuedTasks: queuedTasks,
    _reset: () => queuedTasks.length = 0
  };
}

/**
 * Create mock indexes
 */
function createMockIndexes() {
  return {
    fileShaIndex: jest.fn(() => ({
      keys: jest.fn(() => ['sha1-key-1', 'sha1-key-2', 'sha1-key-3']),
      get: jest.fn((key) => `value-for-${key}`),
      set: jest.fn((key, value) => true)
    })),
    imgFingerIndex: jest.fn(() => ({
      keys: jest.fn(() => ['finger-1', 'finger-2']),
      get: jest.fn((key) => [`file1.jpg`, `file2.jpg`]),
      set: jest.fn((key, value) => true),
      getAll: jest.fn(() => ({
        'finger-1': ['file1.jpg', 'file2.jpg'],
        'finger-2': ['file3.jpg', 'file4.jpg', 'file5.jpg']
      }))
    })),
    ratingIndex: jest.fn(() => ({
      keys: jest.fn(() => ['rated-file-1.jpg', 'rated-file-2.jpg']),
      get: jest.fn((key) => 0.8),
      set: jest.fn((key, value) => true),
      put: jest.fn((key, value) => true)
    })),
    keywordsIndex: jest.fn((redisClient) => ({
      keys: jest.fn(async () => ['keyword1', 'keyword2', 'keyword3']),
      get: jest.fn(async (key) => ['value1', 'value2']),
      set: jest.fn(async (key, values) => true)
    }))
  };
}

/**
 * Create authenticated user for testing
 */
function createAuthenticatedUser(overrides = {}) {
  return {
    username: 'testuser',
    displayName: 'Test User',
    token: 'mock-google-token',
    id: 'test-user-123',
    ...overrides
  };
}

/**
 * Mock file system operations
 */
function createMockFs() {
  const files = new Map();
  const dirs = new Set(['./test/test_data/info']);

  return {
    readdir: jest.fn(async (path) => {
      if (!dirs.has(path)) throw new Error('ENOENT');
      return ['collection1', 'collection2', 'collection3'];
    }),
    mkdir: jest.fn(async (path) => { dirs.add(path); }),
    unlink: jest.fn(async (path) => { files.delete(path); }),
    move: jest.fn(async (src, dest) => {
      const data = files.get(src);
      if (!data) throw new Error('ENOENT');
      files.delete(src);
      files.set(dest, data);
    }),
    pathExists: jest.fn(async (path) => files.has(path) || dirs.has(path)),
    readFile: jest.fn(async (path) => {
      const data = files.get(path);
      if (!data) throw new Error('ENOENT');
      return data;
    }),
    writeFile: jest.fn(async (path, data) => { files.set(path, data); }),
    _files: files,
    _dirs: dirs,
    _reset: () => {
      files.clear();
      dirs.clear();
      dirs.add('./test/test_data/info');
    }
  };
}

/**
 * Setup test fixtures
 */
function setupFixtures() {
  return {
    validImageFile: './test/test_data/faces.jpg',
    importLog: [
      { id: 1, file: 'file1.jpg', timestamp: Date.now() - 1000 },
      { id: 2, file: 'file2.jpg', timestamp: Date.now() - 500 },
      { id: 3, file: 'file3.jpg', timestamp: Date.now() }
    ],
    duplicates: {
      'finger-abc123': ['file1.jpg', 'file2.jpg'],
      'finger-def456': ['file3.jpg', 'file4.jpg', 'file5.jpg']
    }
  };
}

module.exports = {
  createTestApp,
  createMockConfig,
  createMockRedisClient,
  createMockTaskQueue,
  createMockIndexes,
  createAuthenticatedUser,
  createMockFs,
  setupFixtures
};
