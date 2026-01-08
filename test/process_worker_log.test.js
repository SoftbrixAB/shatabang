"use strict"
var assert = require('assert');
const { existsSync, unlinkSync, readFileSync } = require('fs');

var taskProcess = require('../processor/workers/worker_log').default || require('../processor/workers/worker_log');
var processTester = require('./process_test_base');

const worklogFilePath = './test/test_data/workLog'; 

describe('Worker log process', () => {
  it('should handle init method', () => {
    if (existsSync(worklogFilePath)) {
      unlinkSync(worklogFilePath);
    }
    const QUEUES = {
      'name1': { 'waiting': 10, 'active': 11, 'completed': 12, 'failed': 13, 'delayed': 14, 'paused': 15 },
      'name2': { 'waiting': 20, 'active': 21, 'completed': 22, 'failed': 23, 'delayed': 24, 'paused': 25 }
    }
    return new Promise((resolve, reject) => {
      processTester.initProcess(taskProcess, {
        queueTask : function(name, data) {
          assert.fail('Didnt expect another task to be queued: ' + name);
        },
        names: function() {
          // 2
          return Object.keys(QUEUES);
        },
        getJobCounts: function(name) {
          // 3, 4
          assert.ok(QUEUES[name]);
          return QUEUES[name];
        },
        registeredFunctionCallback: function(func) {
          // 1
          func({}, processTester.job, processTester.doneOk).then(async () => {
            // 5
            await new Promise((resolve) => setTimeout(resolve, 100));
            assert.ok(existsSync(worklogFilePath));
            assert.strictEqual(15, readFileSync(worklogFilePath, {encoding: 'utf8'}).split(',').length);
            resolve();
          }, reject);
        }
      });
    });
  });
});
