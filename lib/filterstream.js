
var Transform = require('readable-stream').Transform;

function FilterStream(options) {
  if (!(this instanceof FilterStream)) {
    return new FilterStream(options);
  }

  options.objectMode = true;

  Transform.call(this, options);
  
  var that = this;

  this.once('pipe', function(source) {
    that.source = source;
  });

  this.filter = options.filter;
  this.offset = options.offset;

  this._offsetCounter = 0;

  this._destroyed = false;
}

FilterStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: FilterStream } }
);

FilterStream.prototype._transform = function(data, encoding, done) {

  if ((!this.offset || ++this._offsetCounter > this.offset) &&
      (!this.filter || this.filter(data))) {
    this.push(data);
  }

  done();
};

FilterStream.prototype.destroy = function() {
  if (!this._destroyed) {
    this.source.destroy();
    this.push(null);
  }
  this._destroyed = true;
};

module.exports = FilterStream;
