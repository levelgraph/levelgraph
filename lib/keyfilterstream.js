
var Transform = require('./streamwrapper').Transform;

function KeyFilterStream(options) {
  if (!(this instanceof KeyFilterStream)) {
    return new KeyFilterStream(options);
  }

  options.objectMode = true;

  Transform.call(this, options);

  this.start = options.start;
  
  var that = this;

  this.once('pipe', function(source) {
    that.source = source;
  });

  this.filter = options.filter;
  this._counter = this.limit;

  this._destroyed = false;
}

KeyFilterStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: KeyFilterStream } }
);

KeyFilterStream.prototype._transform = function(data, encoding, done) {

  data.value = JSON.parse(data.value);

  if (data.key.indexOf(this.start) < 0) {
    this.destroy();
  } else if (!this.filter || this.filter(data.value)) {
    this.push(data.value);
  }

  if (--this._counter === 0) {
    this.destroy();
  }

  done();
};

KeyFilterStream.prototype.destroy = function() {
  if (!this._destroyed) {
    this.source.destroy();
  }
  this._destroyed = true;
};

module.exports = KeyFilterStream;
