"use strict"
var taskProcess = require('../processor/workers/import_meta').default || require('../processor/workers/import_meta');
var processTester = require('./process_test_base');

var relativeTestFile = "./faces.jpg";

describe('Import meta process', () => {
  it('should handle init method', () => {
    return new Promise((resolve, reject) => {
      processTester.initProcess(taskProcess, {
        registeredFunctionCallback: function(func) {
          var data = {
            id: '1111111',
            file: relativeTestFile
          };
          func(data, processTester.job, processTester.donePromise(resolve, reject));
          /*data = {
            id: '1111112',
            file: './no_file.jpg'
          };
          func(data, processTester.job, processTester.donePromise(resolve, reject));*/
        }
      });
    });
  });
});
