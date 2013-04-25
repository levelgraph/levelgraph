
var Transform = require("stream").Transform;

function KeyFilterStream(options) {
  if (!(this instanceof KeyFilterStream)) {
    return new KeyFilterStream(options);
  }

  options.objectMode = true;

  Transform.call(this, options);

  this.start = options.start;
  
  var that = this;

  this.once("pipe", function(source) {
    that.source = source;
  });
}

KeyFilterStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: KeyFilterStream } }
);

KeyFilterStream.prototype._transform = function(data, encoding, done) {

  if (data.key.indexOf(this.start) < 0) {
    this.source.destroy();
  } else {
    this.push(JSON.parse(data.value));
  }

  done();
};

module.exports = KeyFilterStream;
