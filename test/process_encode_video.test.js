"use strict"
var assert = require('assert');
var fs = require('fs');
var encoderJob = require('../processor/workers/encode_video').default || require('../processor/workers/encode_video');

const DIR = './test/test_data/'
const TEST_FILE = 'video.mp4';

describe('Encode video process', () => {
  xit('encode a simple video.mp4 with progress', function(done) {
    this.timeout(60000);
    const job = {
      data: {
        storageDir: DIR,
        cacheDir: DIR,
        file: TEST_FILE
      },
      progress: (prcnt)=> { console.log(prcnt); }
    }
    
    encoderJob(job, () => { 
      const stat = fs.statSync(DIR + '1920/' + TEST_FILE);
      assert.strictEqual(stat.isFile(), true);
      console.log('Done: ', stat.size);
      done();
    })
  });
});


