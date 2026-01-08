"use strict"
var assert = require('assert');
var FileTypeRegexp = require('../processor/modules/file_type_regexp').default || require('../processor/modules/file_type_regexp');

describe('File type regexp', () => {
  let expected = '/mnt/cache/1920/2005/03/19/150739.jpg';
  let videoFileName = '/mnt/cache/1920/2005/03/19/150739.AVI';

  it('isVideo', () => {
    assert.equal(true, FileTypeRegexp.isVideo(videoFileName));
    assert.equal(false, FileTypeRegexp.isImage(videoFileName));
  });

  it('from video to image', () => {
    let result = FileTypeRegexp.toCacheImageFileName(videoFileName);
    assert.equal(expected, result);
  });

  it('from mpg video to image', () => {
    let videoFileName = '/mnt/cache/1920/2005/03/19/150739.mpg';
    let result = FileTypeRegexp.toCacheImageFileName(videoFileName);
    assert.equal(expected, result);
  });
});
