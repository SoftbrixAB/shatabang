"use strict"
var assert = require('assert');
var fs = require('fs');
var thumbnailer = require('../processor/modules/thumbnailer').default || require('../processor/modules/thumbnailer');

describe('File type regexp', () => {
  const heicFileName = './test/test_data/sample1.heic';

  it('from heic to image', async () => {
    const jpgFileName = './test/test_data/heic_to_jpg.jpg';
    await thumbnailer.convertHeicToJpg(heicFileName, jpgFileName);
    assert.equal(true, fs.existsSync(jpgFileName));
  });
});
