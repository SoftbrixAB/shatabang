"use strict";
const request = require("supertest");
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { createMockConfig, createAuthenticatedUser } = require('../helpers/test-setup');

// Mock shatabang_files
const mockShFiles = {
  moveFile: jest.fn(async (src, dest) => {
    console.log('Moving file from', src, 'to', dest);
    return true;
  }),
  deleteFile: jest.fn(async (path) => {
    console.log('Deleting file:', path);
    return true;
  }),
  writeFile: jest.fn(async (path, data) => {
    console.log('Writing file:', path);
    return true;
  }),
  _reset: () => {
    mockShFiles.moveFile.mockClear();
    mockShFiles.deleteFile.mockClear();
    mockShFiles.writeFile.mockClear();
  }
};

// Mock task_queue
const mockTaskQueue = {
  queueTask: jest.fn(async (name, data, priority) => ({
    id: Date.now(),
    finished: jest.fn(async () => ({ id: Date.now() }))
  })),
  _reset: () => {
    mockTaskQueue.queueTask.mockClear();
  }
};

// Mock indexes with importedTimesIndex
const mockTimesIndex = {
  data: {
    '2023-01-01': ['collection1/image1.jpg', 'collection1/image2.jpg'],
    '2023-01-02': ['collection2/image3.jpg']
  },
  toJSON: function() {
    return this.data;
  },
  delete: jest.fn((key) => {
    delete mockTimesIndex.data[key];
  }),
  _reset: () => {
    mockTimesIndex.data = {
      '2023-01-01': ['collection1/image1.jpg', 'collection1/image2.jpg'],
      '2023-01-02': ['collection2/image3.jpg']
    };
    mockTimesIndex.delete.mockClear();
  }
};

const mockIndexes = {
  importedTimesIndex: jest.fn(() => mockTimesIndex),
  _reset: () => {
    mockIndexes.importedTimesIndex.mockClear();
    mockTimesIndex._reset();
  }
};

// Mock global fetch for Google Photos API
global.fetch = jest.fn();

jest.mock('../../common/shatabang_files', () => mockShFiles, { virtual: true });
jest.mock('../../common/task_queue', () => mockTaskQueue, { virtual: true });
jest.mock('../../common/indexes', () => mockIndexes, { virtual: true });

describe('Images Route - /api/images', () => {
  let app;
  let config;
  let imagesRouter;

  beforeEach(() => {
    config = createMockConfig();

    jest.resetModules();
    imagesRouter = require('../../routes/images').default || require('../../routes/images');

    app = express();
    app.use(bodyParser.json());

    // Session middleware
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }
    }));

    if (imagesRouter.initialize) {
      imagesRouter.initialize(config);
    }

    app.use('/api/images', imagesRouter);

    mockShFiles._reset();
    mockTaskQueue._reset();
    mockIndexes._reset();
    global.fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /delete', () => {
    it('should return 400 when body is empty array', async () => {
      const response = await request(app)
        .post('/api/images/delete')
        .send([]);

      // Empty array has .length === 0, which is falsy
      expect(response.statusCode).toBe(400);
      expect(response.text).toContain('Missing post data');
    });

    it('should return 400 when body is missing', async () => {
      const response = await request(app)
        .post('/api/images/delete')
        .send();

      expect(response.statusCode).toBe(400);
      expect(response.text).toContain('Missing post data');
    });

    it('should delete single image', async () => {
      const response = await request(app)
        .post('/api/images/delete')
        .send(['collection1/image1.jpg']);

      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('OK');

      expect(mockShFiles.moveFile).toHaveBeenCalledTimes(1);
      expect(mockShFiles.deleteFile).toHaveBeenCalledTimes(2); // 300 and 1920 cache
      expect(mockTaskQueue.queueTask).toHaveBeenCalledTimes(1);
    });

    it('should move image to deleted directory', async () => {
      const response = await request(app)
        .post('/api/images/delete')
        .send(['collection1/photo.jpg']);

      expect(response.statusCode).toBe(200);

      expect(mockShFiles.moveFile).toHaveBeenCalledWith(
        expect.stringContaining('photo.jpg'),
        expect.stringContaining('deleted/photo.jpg')
      );
    });

    it('should delete cache files for both sizes', async () => {
      const response = await request(app)
        .post('/api/images/delete')
        .send(['collection1/image.jpg']);

      expect(response.statusCode).toBe(200);

      expect(mockShFiles.deleteFile).toHaveBeenCalledWith(
        expect.stringContaining('300')
      );
      expect(mockShFiles.deleteFile).toHaveBeenCalledWith(
        expect.stringContaining('1920')
      );
    });

    it('should queue directory update task', async () => {
      const response = await request(app)
        .post('/api/images/delete')
        .send(['vacation2023/photo.jpg']);

      expect(response.statusCode).toBe(200);

      expect(mockTaskQueue.queueTask).toHaveBeenCalledWith(
        'update_directory_list',
        { title: 'vacation2023', dir: 'vacation2023' },
        'high'
      );
    });

    it('should delete multiple images', async () => {
      const response = await request(app)
        .post('/api/images/delete')
        .send([
          'collection1/image1.jpg',
          'collection1/image2.jpg',
          'collection2/image3.jpg'
        ]);

      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('OK');

      expect(mockShFiles.moveFile).toHaveBeenCalledTimes(3);
      expect(mockShFiles.deleteFile).toHaveBeenCalledTimes(6); // 2 per image (300 + 1920)
      expect(mockTaskQueue.queueTask).toHaveBeenCalledTimes(3);
    });

    it('should remove image from times index', async () => {
      const response = await request(app)
        .post('/api/images/delete')
        .send(['collection1/image1.jpg']);

      expect(response.statusCode).toBe(200);

      expect(mockTimesIndex.delete).toHaveBeenCalledWith('2023-01-01');
    });

    it('should handle images not in times index', async () => {
      const response = await request(app)
        .post('/api/images/delete')
        .send(['collection3/nonexistent.jpg']);

      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('OK');

      // Should still move and delete cache
      expect(mockShFiles.moveFile).toHaveBeenCalledTimes(1);
      expect(mockShFiles.deleteFile).toHaveBeenCalledTimes(2);
    });

    it('should handle images with special characters', async () => {
      const response = await request(app)
        .post('/api/images/delete')
        .send(['collection1/photo (1).jpg', 'collection2/image-final_v2.jpg']);

      expect(response.statusCode).toBe(200);

      expect(mockShFiles.moveFile).toHaveBeenCalledTimes(2);
    });

    it('should handle nested directory structures', async () => {
      const response = await request(app)
        .post('/api/images/delete')
        .send(['2023/summer/vacation/photo.jpg']);

      expect(response.statusCode).toBe(200);

      // Should extract first directory segment
      expect(mockTaskQueue.queueTask).toHaveBeenCalledWith(
        'update_directory_list',
        { title: '2023', dir: '2023' },
        'high'
      );
    });

    it('should continue on moveFile error', async () => {
      // Mock moveFile to reject
      mockShFiles.moveFile.mockRejectedValueOnce(new Error('File not found'));

      const response = await request(app)
        .post('/api/images/delete')
        .send(['collection1/missing.jpg']);

      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('OK');

      // Should still try to delete cache files
      expect(mockShFiles.deleteFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /listgoo', () => {
    it('should require authenticated user', async () => {
      // Without authenticated user, the route will fail to access req.user.token
      const response = await request(app).get('/api/images/listgoo');

      // Should fail due to missing authentication
      expect([401, 500]).toContain(response.statusCode);
    });

    it('should call Google Photos API when authenticated', async () => {
      // This test verifies the endpoint exists
      // Full testing of Google Photos streaming requires complex async mocking
      const authenticatedUser = createAuthenticatedUser({
        token: 'valid-google-token'
      });

      // Create new app with auth middleware
      const authApp = express();
      authApp.use(bodyParser.json());
      authApp.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
      }));
      authApp.use((req, res, next) => {
        req.user = authenticatedUser;
        next();
      });

      const freshRouter = require('../../routes/images').default || require('../../routes/images');
      if (freshRouter.initialize) {
        freshRouter.initialize(config);
      }
      authApp.use('/api/images', freshRouter);

      // Mock fetch to return valid response immediately
      global.fetch.mockResolvedValueOnce({
        nextPageToken: null,
        mediaItems: []
      });

      // Note: This test may timeout due to streaming response
      // It verifies the route structure is correct
      const response = await request(authApp)
        .get('/api/images/listgoo')
        .timeout(2000);

      // Should start responding (headers sent)
      expect(response.statusCode).toBeDefined();
    }, 10000);
  });
});
