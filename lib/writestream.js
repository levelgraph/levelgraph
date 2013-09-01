
var Transform = require("./streamwrapper").Transform;
var genKey = require('./utilities').genKey;
var genKeys = require('./utilities').genKeys;
var defs = require('./utilities').defs;

function WriteStream(options) {
  if (!(this instanceof WriteStream)) {
    return new WriteStream(options);
  }

  options.objectMode = true;
  this._type = options.type || 'put';

  Transform.call(this, options);
}

WriteStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: WriteStream } }
);

WriteStream.prototype._transform = function(data, encoding, done) {
  var that = this;

  genActions(this._type, data).forEach(function(action) {
    that.push(action);
  });

  done();
};

module.exports = WriteStream;

function reverseSorter(a, b) {
  // a is less than b by some ordering criterion
  if (a > b)
    return -1;
  // a is greater than b by the ordering criterion
  if (a < b)
    return 1;
}

function genActions(type, triple) {
  var json = JSON.stringify(triple)
    , keys = genKeys(triple)
    , i
    , result = [];

  keys.sort(reverseSorter);

  for (i = 0; i < keys.length; i++) {
    result.push({ type: type, key: keys[i], value: json });
  };

  return result;
}
