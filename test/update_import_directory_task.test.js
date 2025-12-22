"use strict"
var taskProcess = require('../processor/workers/update_import_directory').default || require('../processor/workers/update_import_directory');

var taskQueMock = {
  registerTaskProcessor : jest.fn((name, func) => func('data', {}, () => {})),
  queueTask : jest.fn((name, data) => {
    console.log('Queue task', name, data);
    return {
      finished: () => { then: (cb) => { cb(); } }
    }
  })
};

beforeAll(() => {
  var config = {
    cacheDir : './cache',
    storageDir : './test/test_data/',
    dirs: {
      'import' : './test/test_data/import',
    }};
    taskProcess.init(config, taskQueMock);
});

describe('Worker log process', () => {
  it('should handle init method', () => {
    console.log('Init method');
    expect(taskQueMock.registerTaskProcessor).toHaveBeenCalledTimes(1);
  });
});

