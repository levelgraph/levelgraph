
var Writable = require("stream").Writable;

function CallbackStream(options) {
  if (!(this instanceof CallbackStream)) {
    return new CallbackStream(options);
  }

  options.objectMode = true;

  Writable.call(this, options);

  this.start = options.start;
  this.results = [];
  this.on("finish", function() {
    options.callback(null, this.results);
  });
}

CallbackStream.prototype = Object.create(
  Writable.prototype,
  { constructor: { value: CallbackStream } }
);

CallbackStream.prototype._write = function(data, encoding, done) {
  this.results.push(data);
  done();
};

module.exports = CallbackStream;
