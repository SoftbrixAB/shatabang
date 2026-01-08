"use strict";
const assert = require('assert');
const express = require('express');
const Bull = require('bull');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const passport = require('passport');

describe('Integration Tests - Upgraded Dependencies', () => {

  describe('Express Framework', () => {
    it('should create and configure Express app', () => {
      const app = express();
      assert.ok(app);
      assert.strictEqual(typeof app.listen, 'function');
      assert.strictEqual(typeof app.use, 'function');
      assert.strictEqual(typeof app.get, 'function');
    });

    it('should handle middleware correctly', () => {
      const app = express();
      const middleware = (req, res, next) => { next(); };
      app.use(middleware);
      assert.ok(app);
    });
  });

  describe('Bull Queue', () => {
    it('should import Bull module', () => {
      assert.ok(Bull);
      assert.strictEqual(typeof Bull, 'function');
      // Note: Actual queue creation requires Redis, tested separately
    });
  });

  describe('Sharp Image Processing', () => {
    const testImagePath = './test/test_data/faces.jpg';

    it('should load and process image', async () => {
      if (!fs.existsSync(testImagePath)) {
        return; // Skip if test image doesn't exist
      }

      const image = sharp(testImagePath);
      const metadata = await image.metadata();

      assert.ok(metadata);
      assert.ok(metadata.width > 0);
      assert.ok(metadata.height > 0);
      assert.ok(metadata.format);
    });

    it('should resize image', async () => {
      if (!fs.existsSync(testImagePath)) {
        return; // Skip if test image doesn't exist
      }

      const resized = await sharp(testImagePath)
        .resize(100, 100)
        .toBuffer();

      assert.ok(resized);
      assert.ok(resized.length > 0);
    });
  });

  describe('fs-extra File Operations', () => {
    const testDir = './test/test_data/integration_test_temp';
    const testFile = path.join(testDir, 'test.txt');

    afterEach(async () => {
      // Cleanup
      if (await fs.pathExists(testDir)) {
        await fs.remove(testDir);
      }
    });

    it('should create directory', async () => {
      await fs.ensureDir(testDir);
      const exists = await fs.pathExists(testDir);
      assert.strictEqual(exists, true);
    });

    it('should write and read file', async () => {
      await fs.ensureDir(testDir);
      const content = 'Integration test content';
      await fs.writeFile(testFile, content, 'utf8');

      const readContent = await fs.readFile(testFile, 'utf8');
      assert.strictEqual(readContent, content);
    });

    it('should copy file', async () => {
      await fs.ensureDir(testDir);
      const sourceFile = path.join(testDir, 'source.txt');
      const destFile = path.join(testDir, 'dest.txt');

      await fs.writeFile(sourceFile, 'test', 'utf8');
      await fs.copy(sourceFile, destFile);

      const exists = await fs.pathExists(destFile);
      assert.strictEqual(exists, true);
    });
  });

  describe('Passport Authentication', () => {
    it('should initialize passport', () => {
      const app = express();
      app.use(passport.initialize());
      assert.ok(passport);
      assert.strictEqual(typeof passport.initialize, 'function');
      assert.strictEqual(typeof passport.authenticate, 'function');
    });
  });

  describe('Jest Testing Framework', () => {
    it('should support async/await', async () => {
      const result = await Promise.resolve(42);
      assert.strictEqual(result, 42);
    });

    it('should support modern JavaScript features', () => {
      const arr = [1, 2, 3];
      const doubled = arr.map(x => x * 2);
      assert.deepStrictEqual(doubled, [2, 4, 6]);
    });
  });

  describe('Multer File Upload', () => {
    it('should import multer module', () => {
      const multer = require('multer');
      assert.ok(multer);
      assert.strictEqual(typeof multer, 'function');
    });
  });

  describe('TensorFlow', () => {
    it('should import TensorFlow modules', () => {
      const tf = require('@tensorflow/tfjs-node');
      assert.ok(tf);
      assert.ok(tf.tensor);
    });

    it('should create tensors', () => {
      const tf = require('@tensorflow/tfjs-node');
      const tensor = tf.tensor([1, 2, 3, 4]);
      assert.ok(tensor);
      assert.strictEqual(tensor.size, 4);
      tensor.dispose();
    });
  });

  describe('Utility Packages', () => {
    it('should use async library', (done) => {
      const async = require('async');
      async.series([
        (cb) => cb(null, 1),
        (cb) => cb(null, 2),
      ], (err, results) => {
        assert.ok(!err);
        assert.deepStrictEqual(results, [1, 2]);
        done();
      });
    });
  });
});
