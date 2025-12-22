"use strict";
const request = require("supertest");
const express = require('express');
const { createMockConfig, createMockRedisClient } = require('../helpers/test-setup');

// Mock the keywords index
const mockKeywordsIndex = {
  keys: jest.fn(async () => ['keyword1', 'keyword2', 'keyword3']),
  get: jest.fn(async (key) => ['value1', 'value2']),
  _reset: () => {
    mockKeywordsIndex.keys.mockClear();
    mockKeywordsIndex.get.mockClear();
    mockKeywordsIndex.keys.mockResolvedValue(['keyword1', 'keyword2', 'keyword3']);
    mockKeywordsIndex.get.mockResolvedValue(['value1', 'value2']);
  }
};

// Mock the indexes module
jest.mock('../../common/indexes', () => ({
  keywordsIndex: jest.fn(() => mockKeywordsIndex)
}), { virtual: true });

describe('Keywords Route - GET /api/keywords', () => {
  let app;
  let config;
  let mockRedisClient;
  let keywordsRouter;

  beforeEach(() => {
    // Create fresh mocks
    mockRedisClient = createMockRedisClient();
    config = createMockConfig();
    config.redisClient = mockRedisClient;

    // Reset the keywords index mock
    mockKeywordsIndex._reset();

    // Clear module cache to get fresh router
    delete require.cache[require.resolve('../../routes/keywords')];
    keywordsRouter = require('../../routes/keywords').default || require('../../routes/keywords');

    app = express();
    if (keywordsRouter.initialize) {
      keywordsRouter.initialize(config);
    }
    app.use('/api/keywords', keywordsRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return all keywords', async () => {
      mockKeywordsIndex.keys.mockResolvedValueOnce(['keyword1', 'keyword2', 'keyword3']);

      const response = await request(app).get('/api/keywords');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result).toEqual({ keywords: ['keyword1', 'keyword2', 'keyword3'] });
    });

    it('should return empty array when no keywords exist', async () => {
      mockKeywordsIndex.keys.mockResolvedValueOnce([]);

      const response = await request(app).get('/api/keywords');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result).toEqual({ keywords: [] });
    });

    it('should handle Redis errors', async () => {
      // Create fresh app with error-throwing mock
      mockKeywordsIndex.keys = jest.fn(async () => {
        throw new Error('Redis connection failed');
      });

      delete require.cache[require.resolve('../../routes/keywords')];
      const errorRouter = require('../../routes/keywords').default || require('../../routes/keywords');

      const errorApp = express();
      if (errorRouter.initialize) {
        errorRouter.initialize(config);
      }
      errorApp.use('/api/keywords', errorRouter);

      const response = await request(errorApp).get('/api/keywords');

      expect(response.statusCode).toBe(500);
    });
  });

  describe('GET /:id', () => {
    it('should return values for specific keyword', async () => {
      mockKeywordsIndex.get.mockResolvedValueOnce(['value1', 'value2', 'value3']);

      const response = await request(app).get('/api/keywords/nature');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result).toEqual({ keyword: ['value1', 'value2', 'value3'] });
    });

    it('should return empty array for non-existent keyword', async () => {
      mockKeywordsIndex.get.mockResolvedValueOnce([]);

      const response = await request(app).get('/api/keywords/nonexistent');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result).toEqual({ keyword: [] });
    });

    it('should handle special characters in keyword id', async () => {
      mockKeywordsIndex.get.mockResolvedValueOnce(['val1', 'val2']);

      const response = await request(app).get('/api/keywords/keyword-with-dash');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result).toEqual({ keyword: ['val1', 'val2'] });
    });

    it('should handle Redis errors when fetching keyword values', async () => {
      // Create fresh app with error-throwing mock
      mockKeywordsIndex.get = jest.fn(async () => {
        throw new Error('Redis error');
      });

      delete require.cache[require.resolve('../../routes/keywords')];
      const errorRouter = require('../../routes/keywords').default || require('../../routes/keywords');

      const errorApp = express();
      if (errorRouter.initialize) {
        errorRouter.initialize(config);
      }
      errorApp.use('/api/keywords', errorRouter);

      const response = await request(errorApp).get('/api/keywords/test');

      expect(response.statusCode).toBe(500);
    });
  });
});
