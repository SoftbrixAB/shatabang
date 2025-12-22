"use strict";
const request = require("supertest");
const express = require('express');
const versionRouter = require('../../routes/version').default || require('../../routes/version');

describe('Version Route - GET /api/version', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/api/version', versionRouter);
  });

  describe('GET /', () => {
    it('should return version string', async () => {
      const response = await request(app).get('/api/version');

      expect(response.statusCode).toBe(200);
      expect(response.text).toBeTruthy();
      expect(response.text).toMatch(/^\d+\.\d+\.\d+/); // Semantic version format
    });

    it('should return text/html content type', async () => {
      const response = await request(app).get('/api/version');

      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should return consistent version across multiple requests', async () => {
      const response1 = await request(app).get('/api/version');
      const response2 = await request(app).get('/api/version');

      expect(response1.text).toBe(response2.text);
    });
  });
});
