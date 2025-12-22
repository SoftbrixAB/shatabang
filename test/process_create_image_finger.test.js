"use strict"
var assert = require('assert');

var taskProcess = require('../processor/workers/create_image_finger').default || require('../processor/workers/create_image_finger');
var processTester = require('./process_test_base');

var relativeTestFile = "./faces.jpg";

describe('Create image finger process', () => {
  it('should create image and file hash', done => {
    processTester.initProcess(taskProcess, {
      queueTask : function(name, data) {
        assert.fail('Didnt expect another task to be queued');
      },
      registeredFunctionCallback: function(func) {
        var data = {
          file: relativeTestFile
        };
        func(data, processTester.job, (args) => {
            processTester.doneOk(args);
            done();
        });
      }
    });
  });
});
