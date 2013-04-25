
var Writable = require("stream").Writable;

function ContextBinderStream(options) {
  if (!(this instanceof ContextBinderStream)) {
    return new ContextBinderStream(options);
  }

  options.objectMode = true;

  Writable.call(this, options);
  this.matcher = options.matcher;
  this.context = options.context;
}

ContextBinderStream.prototype = Object.create(
  Writable.prototype,
  { constructor: { value: ContextBinderStream } }
);

ContextBinderStream.prototype._write = function(triple, encoding, done) {

  var newContext = this.matcher(this.context, triple);

  if (newContext) {
    this.emit("context", newContext);
  }

  done();
};

module.exports = ContextBinderStream;
