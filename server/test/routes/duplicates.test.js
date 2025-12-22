"use strict";
const request = require("supertest");
const express = require('express');
const { createMockConfig } = require('../helpers/test-setup');

// Helper function to create a fresh app with custom mock
function createAppWithMock(mockData) {
  const mockFingerIndex = {
    keys: jest.fn(() => mockData.keys || []),
    get: jest.fn((key) => {
      if (mockData.getMap && mockData.getMap[key]) {
        return mockData.getMap[key];
      }
      return mockData.defaultGet || [];
    }),
    set: jest.fn(() => true)
  };

  const mockIndexes = {
    imgFingerIndex: jest.fn(() => mockFingerIndex)
  };

  jest.resetModules();
  jest.doMock('../../common/indexes', () => mockIndexes, { virtual: true });

  const config = createMockConfig();
  delete require.cache[require.resolve('../../routes/duplicates')];
  const router = require('../../routes/duplicates').default || require('../../routes/duplicates');

  const app = express();
  if (router.initialize) {
    router.initialize(config);
  }
  app.use('/api/duplicates', router);

  return { app, mockFingerIndex };
}

describe('Duplicates Route - /api/duplicates', () => {
  afterEach(() => {
    jest.resetModules();
  });

  describe('GET /list', () => {
    it('should return list of duplicate images', async () => {
      const { app } = createAppWithMock({
        keys: ['finger-abc123', 'finger-def456', 'finger-ghi789'],
        getMap: {
          'finger-abc123': ['img1.jpg', 'img2.jpg', 'img3.jpg'],
          'finger-def456': ['img4.jpg', 'img5.jpg'],
          'finger-ghi789': ['img6.jpg']
        }
      });

      const response = await request(app).get('/api/duplicates/list');

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
      const { app } = createAppWithMock({
        keys: ['finger-1', 'finger-2', 'finger-3'],
        getMap: {
          'finger-1': ['single1.jpg'],
          'finger-2': ['single2.jpg'],
          'finger-3': ['single3.jpg']
        }
      });

      const response = await request(app).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result).toEqual([]);
    });

    it('should return empty array when no fingerprints exist', async () => {
      const { app } = createAppWithMock({
        keys: [],
        defaultGet: []
      });

      const response = await request(app).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result).toEqual([]);
    });

    it('should handle mix of duplicates and non-duplicates', async () => {
      const { app } = createAppWithMock({
        keys: ['finger-a', 'finger-b', 'finger-c', 'finger-d', 'finger-e'],
        getMap: {
          'finger-a': ['unique1.jpg'],
          'finger-b': ['dup1.jpg', 'dup2.jpg'],
          'finger-c': ['unique2.jpg'],
          'finger-d': ['dup3.jpg', 'dup4.jpg', 'dup5.jpg'],
          'finger-e': ['unique3.jpg']
        }
      });

      const response = await request(app).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.length).toBe(2);
      expect(result[0].key).toBe('finger-b');
      expect(result[0].items).toHaveLength(2);
      expect(result[1].key).toBe('finger-d');
      expect(result[1].items).toHaveLength(3);
    });

    it('should handle large duplicate groups', async () => {
      const largeGroup = Array.from({ length: 50 }, (_, i) => `duplicate${i + 1}.jpg`);

      const { app } = createAppWithMock({
        keys: ['finger-large'],
        getMap: {
          'finger-large': largeGroup
        }
      });

      const response = await request(app).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.length).toBe(1);
      expect(result[0].items).toHaveLength(50);
    });

    it('should handle fingerprint keys with special characters', async () => {
      const { app } = createAppWithMock({
        keys: ['finger-abc_123', 'finger-def-456'],
        getMap: {
          'finger-abc_123': ['file1.jpg', 'file2.jpg'],
          'finger-def-456': ['file3.jpg', 'file4.jpg']
        }
      });

      const response = await request(app).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.length).toBe(2);
      expect(result[0].key).toBe('finger-abc_123');
      expect(result[1].key).toBe('finger-def-456');
    });

    it('should handle file names with special characters', async () => {
      const { app } = createAppWithMock({
        keys: ['finger-test'],
        getMap: {
          'finger-test': [
            'photo (1).jpg',
            'photo-edited_final.jpg',
            'my vacation 2023.jpg'
          ]
        }
      });

      const response = await request(app).get('/api/duplicates/list');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result[0].items).toEqual([
        'photo (1).jpg',
        'photo-edited_final.jpg',
        'my vacation 2023.jpg'
      ]);
    });

    it('should properly format JSON response', async () => {
      const { app } = createAppWithMock({
        keys: ['key1', 'key2'],
        getMap: {
          'key1': ['a.jpg', 'b.jpg'],
          'key2': ['c.jpg', 'd.jpg']
        }
      });

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
