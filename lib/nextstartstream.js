var Writable = require('stream').Writable,
    util = require('util'),
    utilities = require('./utilities');

function NextStartStream(pattern) {
  Writable.call(this, {objectMode : true});
  this.last = {};
  this._pattern = pattern;
}

util.inherits(NextStartStream, Writable);

NextStartStream.prototype._write = function (data, encoding, done) {
  this.last = data;
  done();
};

NextStartStream.prototype.getNextStart = function () {
  //this piece of code generates the next start index to be used to retrieve the next page
  return utilities.genKey(utilities.findIndex(utilities.typesFromPattern(this.last), utilities.findIndex(utilities.typesFromPattern(this._pattern), '')), this.last, '') + '\xff';
};

module.exports = NextStartStream;
