"use strict"
const request = require("supertest");
const express = require('express');
const versionRouter = require('../routes/version').default || require('../routes/version');

const app = express();

app.use('/api/version', versionRouter);

// Todo: start server before running tests
describe('GET /api/version', function() {
    it('Should return OK', async () => {
        const response = await request(app).get("/api/version");
        expect(response.statusCode).toBe(200);
        expect(response.text).not.toBe(null);
        console.log('Body:', response.text);
    });
});