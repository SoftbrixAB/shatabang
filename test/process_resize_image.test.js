"use strict"
var assert = require('assert');

var taskProcess = require('../processor/workers/resize_image').default || require('../processor/workers/resize_image');
var processTester = require('./process_test_base');

var relativeTestFile = "./faces.jpg";

describe('Resize image process', () => {
  it('should handle init method', () => {
    return new Promise((resolve, reject) => {
      processTester.initProcess(taskProcess, {
        queueTask : function(name, data) {
          assert.fail('Didnt expect another task to be queued: ' + name);
        },
        registeredFunctionCallback: function(func) {
          var data = {
            width: 960,
            height: 540,
            keepAspec: true,
            file: relativeTestFile
          };
          func(data, processTester.job, processTester.doneOk).then(resolve, reject);
          func(Object.assign(data, { width: 1920, height: 1080 }), processTester.job, processTester.doneOk);
        }
      });
    });
  });
});
