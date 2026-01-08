"use strict";
const request = require("supertest");
const express = require('express');
const { createMockConfig } = require('../helpers/test-setup');

// Mock shatabang_files
const mockShFiles = {
  listSubDirs: jest.fn((path, callback) => {
    callback(null, ['collection1', 'collection2', 'collection3']);
  }),
  _reset: () => {
    mockShFiles.listSubDirs.mockClear();
    mockShFiles.listSubDirs.mockImplementation((path, callback) => {
      callback(null, ['collection1', 'collection2', 'collection3']);
    });
  }
};

jest.mock('../../common/shatabang_files', () => mockShFiles, { virtual: true });

describe('Dirs Route - GET /api/dirs', () => {
  let app;
  let config;
  let dirsRouter;

  beforeEach(() => {
    config = createMockConfig();

    delete require.cache[require.resolve('../../routes/dirs')];
    dirsRouter = require('../../routes/dirs').default || require('../../routes/dirs');

    app = express();

    if (dirsRouter.initialize) {
      dirsRouter.initialize(config);
    }

    app.use('/api/dirs', dirsRouter);
    mockShFiles._reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /list', () => {
    it('should return list of directories', async () => {
      mockShFiles.listSubDirs.mockImplementationOnce((path, callback) => {
        callback(null, ['collection1', 'collection2', 'collection3']);
      });

      const response = await request(app).get('/api/dirs/list');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(['collection1', 'collection2', 'collection3']);
      expect(mockShFiles.listSubDirs).toHaveBeenCalled();
    });

    it('should return empty array when no directories exist', async () => {
      mockShFiles.listSubDirs.mockImplementationOnce((path, callback) => {
        callback(null, []);
      });

      const response = await request(app).get('/api/dirs/list');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockShFiles.listSubDirs.mockImplementationOnce((path, callback) => {
        callback(new Error('Directory not found'), null);
      });

      const response = await request(app).get('/api/dirs/list');

      expect(response.statusCode).toBe(500);
      expect(response.text).toContain('Error loading directories');
    });

    it('should handle ENOENT error', async () => {
      const error = new Error('ENOENT');
      error.code = 'ENOENT';
      mockShFiles.listSubDirs.mockImplementationOnce((path, callback) => {
        callback(error, null);
      });

      const response = await request(app).get('/api/dirs/list');

      expect(response.statusCode).toBe(500);
    });
  });
});
