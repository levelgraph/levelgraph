
var Transform = require("./streamwrapper").Transform;
var genKey = require('./utilities').genKey;
var genKeys = require('./utilities').genKeys;
var defs = require('./utilities').defs;
var genActions = require('./utilities').genActions;

function WriteStream(options) {
  if (!(this instanceof WriteStream)) {
    return new WriteStream(options);
  }

  options = options || {};
  options.objectMode = true;

  Transform.call(this, options);
}

WriteStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: WriteStream } }
);

WriteStream.prototype._transform = function(data, encoding, done) {
  var that = this, i, actions = genActions(data);

  for (i = 0; i < actions.length; i++) {
    that.push(actions[i]);
  }

  done();
};

module.exports = WriteStream;
