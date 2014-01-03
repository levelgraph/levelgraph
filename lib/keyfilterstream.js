
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
  this.offset = options.offset;

  this._offsetCounter = 0;

  this._destroyed = false;
}

KeyFilterStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: KeyFilterStream } }
);

KeyFilterStream.prototype._transform = function(data, encoding, done) {
  data.value = JSON.parse(data.value);

  if ((!this.offset || ++this._offsetCounter > this.offset) &&
      (!this.filter || this.filter(data.value))) {
    this.push(data.value);
  }

  done();
};

KeyFilterStream.prototype.destroy = function() {
  if (!this._destroyed) {
    this.source.destroy();
    this.push(null);
  }
  this._destroyed = true;
};

module.exports = KeyFilterStream;
