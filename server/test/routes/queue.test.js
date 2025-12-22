"use strict";
const request = require("supertest");
const express = require('express');
const bodyParser = require('body-parser');
const { createMockConfig } = require('../helpers/test-setup');

// Mock task_queue before requiring the route
const mockTaskQueue = {
  names: jest.fn(() => ['process_image', 'generate_thumb', 'extract_metadata']),
  getJobCounts: jest.fn(async (queueName) => ({
    active: 2,
    waiting: 5,
    completed: 100,
    failed: 3,
    delayed: 0,
    paused: 0
  })),
  queueTask: jest.fn(async (name, data, priority) => ({
    id: Date.now(),
    finished: jest.fn(async () => ({ id: Date.now() }))
  })),
  _reset: () => {
    mockTaskQueue.names.mockClear();
    mockTaskQueue.getJobCounts.mockClear();
    mockTaskQueue.queueTask.mockClear();
    // Reset default implementations
    mockTaskQueue.names.mockReturnValue(['process_image', 'generate_thumb', 'extract_metadata']);
    mockTaskQueue.getJobCounts.mockResolvedValue({
      active: 2,
      waiting: 5,
      completed: 100,
      failed: 3,
      delayed: 0,
      paused: 0
    });
  }
};

jest.mock('../../common/task_queue', () => mockTaskQueue, { virtual: true });

describe('Queue Route - /api/queue', () => {
  let app;
  let config;
  let queueRouter;

  beforeEach(() => {
    config = createMockConfig();

    delete require.cache[require.resolve('../../routes/queue')];
    queueRouter = require('../../routes/queue').default || require('../../routes/queue');

    app = express();
    app.use(bodyParser.json());

    if (queueRouter.initialize) {
      queueRouter.initialize(config);
    }

    app.use('/api/queue', queueRouter);
    mockTaskQueue._reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /status', () => {
    it('should return status for all queues', async () => {
      mockTaskQueue.getJobCounts.mockResolvedValue({
        active: 1,
        waiting: 3,
        completed: 50,
        failed: 2,
        delayed: 0,
        paused: 0
      });

      const response = await request(app).get('/api/queue/status');

      expect(response.statusCode).toBe(200);
      expect(mockTaskQueue.names).toHaveBeenCalled();
      expect(mockTaskQueue.getJobCounts).toHaveBeenCalledTimes(3);

      const result = JSON.parse(response.text);
      expect(result).toHaveProperty('process_image');
      expect(result).toHaveProperty('generate_thumb');
      expect(result).toHaveProperty('extract_metadata');
    });

    it('should handle empty queue list', async () => {
      mockTaskQueue.names.mockReturnValueOnce([]);

      const response = await request(app).get('/api/queue/status');

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.text)).toEqual({});
    });

    it('should return correct job counts structure', async () => {
      mockTaskQueue.names.mockReturnValueOnce(['test_queue']);
      mockTaskQueue.getJobCounts.mockResolvedValueOnce({
        active: 5,
        waiting: 10,
        completed: 200,
        failed: 15,
        delayed: 2,
        paused: 0
      });

      const response = await request(app).get('/api/queue/status');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.test_queue).toEqual({
        active: 5,
        waiting: 10,
        completed: 200,
        failed: 15,
        delayed: 2,
        paused: 0
      });
    });
  });

  describe('GET /status/:queue', () => {
    it('should return status for specific queue', async () => {
      mockTaskQueue.getJobCounts.mockResolvedValueOnce({
        active: 3,
        waiting: 7,
        completed: 150,
        failed: 5,
        delayed: 1,
        paused: 0
      });

      const response = await request(app).get('/api/queue/status/process_image');

      expect(response.statusCode).toBe(200);
      expect(mockTaskQueue.getJobCounts).toHaveBeenCalledWith('process_image');
      expect(mockTaskQueue.getJobCounts).toHaveBeenCalledTimes(1);

      const result = JSON.parse(response.text);
      expect(result).toHaveProperty('process_image');
      expect(result.process_image.active).toBe(3);
    });

    it('should handle queue with special characters in name', async () => {
      mockTaskQueue.getJobCounts.mockResolvedValueOnce({
        active: 0,
        waiting: 0,
        completed: 10,
        failed: 0,
        delayed: 0,
        paused: 0
      });

      const response = await request(app).get('/api/queue/status/image-processing_v2');

      expect(response.statusCode).toBe(200);
      expect(mockTaskQueue.getJobCounts).toHaveBeenCalledWith('image-processing_v2');
    });

    it('should handle non-existent queue', async () => {
      mockTaskQueue.getJobCounts.mockResolvedValueOnce({
        active: 0,
        waiting: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0
      });

      const response = await request(app).get('/api/queue/status/nonexistent');

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.nonexistent).toBeDefined();
    });
  });

  describe('POST /add/:name/:priority/', () => {
    it('should add task to queue with name and priority', async () => {
      const response = await request(app)
        .post('/api/queue/add/process_image/high/')
        .send({ fileId: 'test-123', operation: 'resize' });

      expect(response.statusCode).toBe(200);
      expect(response.text).toContain('id: process_image');
      expect(response.text).toContain('priority: high');

      expect(mockTaskQueue.queueTask).toHaveBeenCalledWith(
        'process_image',
        { fileId: 'test-123', operation: 'resize' },
        'high'
      );
    });

    it('should handle task with no body params', async () => {
      const response = await request(app)
        .post('/api/queue/add/simple_task/normal/');

      expect(response.statusCode).toBe(200);
      expect(mockTaskQueue.queueTask).toHaveBeenCalledWith(
        'simple_task',
        {},
        'normal'
      );
    });

    it('should accept different priority levels', async () => {
      await request(app).post('/api/queue/add/task1/low/').send({});
      await request(app).post('/api/queue/add/task2/normal/').send({});
      await request(app).post('/api/queue/add/task3/high/').send({});

      expect(mockTaskQueue.queueTask).toHaveBeenNthCalledWith(1, 'task1', {}, 'low');
      expect(mockTaskQueue.queueTask).toHaveBeenNthCalledWith(2, 'task2', {}, 'normal');
      expect(mockTaskQueue.queueTask).toHaveBeenNthCalledWith(3, 'task3', {}, 'high');
    });

    it('should handle task names with special characters', async () => {
      const response = await request(app)
        .post('/api/queue/add/process-image_v2/high/')
        .send({ test: true });

      expect(response.statusCode).toBe(200);
      expect(mockTaskQueue.queueTask).toHaveBeenCalledWith(
        'process-image_v2',
        { test: true },
        'high'
      );
    });

    it('should pass complex body parameters', async () => {
      const complexParams = {
        file: 'image.jpg',
        options: {
          resize: { width: 800, height: 600 },
          quality: 85
        },
        metadata: ['exif', 'iptc']
      };

      const response = await request(app)
        .post('/api/queue/add/process_image/high/')
        .send(complexParams);

      expect(response.statusCode).toBe(200);
      expect(mockTaskQueue.queueTask).toHaveBeenCalledWith(
        'process_image',
        complexParams,
        'high'
      );
    });
  });

  describe('POST /addFolder/:folder/:name/:priority/', () => {
    it('should add folder task to queue', async () => {
      const response = await request(app)
        .post('/api/queue/addFolder/2023/process_images/high/')
        .send({ recursive: true });

      expect(response.statusCode).toBe(200);
      expect(response.text).toContain('id: process_images');
      expect(response.text).toContain('priority: high');

      expect(mockTaskQueue.queueTask).toHaveBeenCalledWith(
        'run_task_in_folder',
        {
          dir: '2023',
          params: { recursive: true },
          task_name: 'process_images',
          priority: 'high'
        },
        'high'
      );
    });

    it('should handle folder task with no body params', async () => {
      const response = await request(app)
        .post('/api/queue/addFolder/vacation/thumbnail/normal/');

      expect(response.statusCode).toBe(200);
      expect(mockTaskQueue.queueTask).toHaveBeenCalledWith(
        'run_task_in_folder',
        {
          dir: 'vacation',
          params: {},
          task_name: 'thumbnail',
          priority: 'normal'
        },
        'normal'
      );
    });

    it('should handle folder paths with special characters', async () => {
      const response = await request(app)
        .post('/api/queue/addFolder/2023-vacation_photos/process/high/')
        .send({ option: 'value' });

      expect(response.statusCode).toBe(200);
      expect(mockTaskQueue.queueTask).toHaveBeenCalledWith(
        'run_task_in_folder',
        {
          dir: '2023-vacation_photos',
          params: { option: 'value' },
          task_name: 'process',
          priority: 'high'
        },
        'high'
      );
    });

    it('should pass complex parameters to folder task', async () => {
      const complexParams = {
        filters: ['*.jpg', '*.png'],
        options: {
          watermark: true,
          quality: 90
        }
      };

      const response = await request(app)
        .post('/api/queue/addFolder/uploads/watermark/high/')
        .send(complexParams);

      expect(response.statusCode).toBe(200);
      expect(mockTaskQueue.queueTask).toHaveBeenCalledWith(
        'run_task_in_folder',
        {
          dir: 'uploads',
          params: complexParams,
          task_name: 'watermark',
          priority: 'high'
        },
        'high'
      );
    });

    it('should accept different priorities for folder tasks', async () => {
      await request(app).post('/api/queue/addFolder/dir1/task1/low/').send({});
      await request(app).post('/api/queue/addFolder/dir2/task2/normal/').send({});
      await request(app).post('/api/queue/addFolder/dir3/task3/high/').send({});

      const calls = mockTaskQueue.queueTask.mock.calls;
      expect(calls[0][2]).toBe('low');
      expect(calls[1][2]).toBe('normal');
      expect(calls[2][2]).toBe('high');
    });
  });
});
