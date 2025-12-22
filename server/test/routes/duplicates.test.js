"use strict";
const request = require("supertest");
const express = require('express');
const { createMockConfig, createMockIndexes } = require('../helpers/test-setup');

// Create mock indexes at module level
const mockIndexes = createMockIndexes();

// Mock the indexes module before requiring the route
jest.mock('../../common/indexes', () => mockIndexes, { virtual: true });

describe('Duplicates Route - /api/duplicates', () => {
  let app;
  let config;
  let duplicatesRouter;

  beforeEach(() => {
    config = createMockConfig();

    // Get fresh router
    delete require.cache[require.resolve('../../routes/duplicates')];
    duplicatesRouter = require('../../routes/duplicates').default || require('../../routes/duplicates');

    app = express();

    if (duplicatesRouter.initialize) {
      duplicatesRouter.initialize(config);
    }

    app.use('/api/duplicates', duplicatesRouter);

    // Reset mocks
    const fingerIndex = mockIndexes.imgFingerIndex();
    fingerIndex.keys.mockClear();
    fingerIndex.get.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /list', () => {
    it('should return list of duplicate images', async () => {
      const mockFingerIndex = mockIndexes.imgFingerIndex();

      // Override the mock functions for this specific test
      mockFingerIndex.keys = jest.fn(() => [
        'finger-abc123',
        'finger-def456',
        'finger-ghi789'
      ]);

      mockFingerIndex.get = jest.fn((key) => {
        if (key === 'finger-abc123') return ['img1.jpg', 'img2.jpg', 'img3.jpg'];
        if (key === 'finger-def456') return ['img4.jpg', 'img5.jpg'];
        if (key === 'finger-ghi789') return ['img6.jpg'];
        return [];
      });

      // Reinitialize router with new mock
      delete require.cache[require.resolve('../../routes/duplicates')];
      const freshRouter = require('../../routes/duplicates').default || require('../../routes/duplicates');
      const freshApp = express();
      if (freshRouter.initialize) {
        freshRouter.initialize(config);
      }
      freshApp.use('/api/duplicates', freshRouter);

      const response = await request(freshApp).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const result = JSON.parse(response.text);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // Only groups with > 1 item

      expect(result[0]).toEqual({
        key: 'finger-abc123',
        items: ['img1.jpg', 'img2.jpg', 'img3.jpg']
      });

      expect(result[1]).toEqual({
        key: 'finger-def456',
        items: ['img4.jpg', 'img5.jpg']
      });
    });

    it('should return empty array when no duplicates exist', async () => {
      const mockFingerIndex = mockIndexes.imgFingerIndex();

      mockFingerIndex.keys = jest.fn(() => ['finger-1', 'finger-2', 'finger-3']);
      mockFingerIndex.get = jest.fn((key) => {
        if (key === 'finger-1') return ['single1.jpg'];
        if (key === 'finger-2') return ['single2.jpg'];
        if (key === 'finger-3') return ['single3.jpg'];
        return [];
      });

      delete require.cache[require.resolve('../../routes/duplicates')];
      const freshRouter = require('../../routes/duplicates').default || require('../../routes/duplicates');
      const freshApp = express();
      if (freshRouter.initialize) freshRouter.initialize(config);
      freshApp.use('/api/duplicates', freshRouter);

      const response = await request(freshApp).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result).toEqual([]);
    });

    it('should return empty array when no fingerprints exist', async () => {
      const mockFingerIndex = mockIndexes.imgFingerIndex();

      mockFingerIndex.keys = jest.fn(() => []);
      mockFingerIndex.get = jest.fn(() => []);

      delete require.cache[require.resolve('../../routes/duplicates')];
      const freshRouter = require('../../routes/duplicates').default || require('../../routes/duplicates');
      const freshApp = express();
      if (freshRouter.initialize) freshRouter.initialize(config);
      freshApp.use('/api/duplicates', freshRouter);

      const response = await request(freshApp).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result).toEqual([]);
    });

    it('should handle mix of duplicates and non-duplicates', async () => {
      const mockFingerIndex = mockIndexes.imgFingerIndex();

      mockFingerIndex.keys = jest.fn(() => [
        'finger-a',
        'finger-b',
        'finger-c',
        'finger-d',
        'finger-e'
      ]);

      mockFingerIndex.get = jest.fn((key) => {
        if (key === 'finger-a') return ['unique1.jpg'];
        if (key === 'finger-b') return ['dup1.jpg', 'dup2.jpg'];
        if (key === 'finger-c') return ['unique2.jpg'];
        if (key === 'finger-d') return ['dup3.jpg', 'dup4.jpg', 'dup5.jpg'];
        if (key === 'finger-e') return ['unique3.jpg'];
        return [];
      });

      delete require.cache[require.resolve('../../routes/duplicates')];
      const freshRouter = require('../../routes/duplicates').default || require('../../routes/duplicates');
      const freshApp = express();
      if (freshRouter.initialize) freshRouter.initialize(config);
      freshApp.use('/api/duplicates', freshRouter);

      const response = await request(freshApp).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.length).toBe(2);
      expect(result[0].key).toBe('finger-b');
      expect(result[0].items).toHaveLength(2);
      expect(result[1].key).toBe('finger-d');
      expect(result[1].items).toHaveLength(3);
    });

    it('should handle large duplicate groups', async () => {
      const mockFingerIndex = mockIndexes.imgFingerIndex();

      const largeGroup = Array.from({ length: 50 }, (_, i) => `duplicate${i + 1}.jpg`);

      mockFingerIndex.keys = jest.fn(() => ['finger-large']);
      mockFingerIndex.get = jest.fn((key) => {
        if (key === 'finger-large') return largeGroup;
        return [];
      });

      delete require.cache[require.resolve('../../routes/duplicates')];
      const freshRouter = require('../../routes/duplicates').default || require('../../routes/duplicates');
      const freshApp = express();
      if (freshRouter.initialize) freshRouter.initialize(config);
      freshApp.use('/api/duplicates', freshRouter);

      const response = await request(freshApp).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.length).toBe(1);
      expect(result[0].items).toHaveLength(50);
    });

    it('should handle fingerprint keys with special characters', async () => {
      const mockFingerIndex = mockIndexes.imgFingerIndex();

      mockFingerIndex.keys = jest.fn(() => ['finger-abc_123', 'finger-def-456']);
      mockFingerIndex.get = jest.fn((key) => {
        if (key === 'finger-abc_123') return ['file1.jpg', 'file2.jpg'];
        if (key === 'finger-def-456') return ['file3.jpg', 'file4.jpg'];
        return [];
      });

      delete require.cache[require.resolve('../../routes/duplicates')];
      const freshRouter = require('../../routes/duplicates').default || require('../../routes/duplicates');
      const freshApp = express();
      if (freshRouter.initialize) freshRouter.initialize(config);
      freshApp.use('/api/duplicates', freshRouter);

      const response = await request(freshApp).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.length).toBe(2);
      expect(result[0].key).toBe('finger-abc_123');
      expect(result[1].key).toBe('finger-def-456');
    });

    it('should handle file names with special characters', async () => {
      const mockFingerIndex = mockIndexes.imgFingerIndex();

      mockFingerIndex.keys = jest.fn(() => ['finger-test']);
      mockFingerIndex.get = jest.fn((key) => {
        if (key === 'finger-test') {
          return [
            'photo (1).jpg',
            'photo-edited_final.jpg',
            'my vacation 2023.jpg'
          ];
        }
        return [];
      });

      delete require.cache[require.resolve('../../routes/duplicates')];
      const freshRouter = require('../../routes/duplicates').default || require('../../routes/duplicates');
      const freshApp = express();
      if (freshRouter.initialize) freshRouter.initialize(config);
      freshApp.use('/api/duplicates', freshRouter);

      const response = await request(freshApp).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result[0].items).toEqual([
        'photo (1).jpg',
        'photo-edited_final.jpg',
        'my vacation 2023.jpg'
      ]);
    });

    it('should properly format JSON response', async () => {
      const mockFingerIndex = mockIndexes.imgFingerIndex();

      mockFingerIndex.keys.mockReturnValueOnce(['key1', 'key2']);
      mockFingerIndex.get
        .mockReturnValueOnce(['a.jpg', 'b.jpg'])
        .mockReturnValueOnce(['c.jpg', 'd.jpg']);

      const response = await request(app).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      // Verify it's valid JSON
      expect(() => JSON.parse(response.text)).not.toThrow();

      const result = JSON.parse(response.text);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
