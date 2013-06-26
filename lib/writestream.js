
var Transform = require("../streamwrapper.js").Transform;
var genKey = require('./utilities').genKey;
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

function genKeys(triple) {
  return Object.keys(defs).map(function(key) {
    return genKey(key, triple);
  });
}

function genActions(type, triple) {
  var json = JSON.stringify(triple);
  return genKeys(triple).map(function(key) {
    return { type: type, key: key, value: json };
  });
}
