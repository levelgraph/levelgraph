
var Transform = require("../streamwrapper.js").Transform
  , materializer = require("./utilities").materializer;

function MaterializerStream(options) {
  if (!(this instanceof MaterializerStream)) {
    return new MaterializerStream(options);
  }

  options.objectMode = true;

  Transform.call(this, options);

  this.pattern = options.pattern;
}

MaterializerStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: MaterializerStream } }
);

MaterializerStream.prototype._transform = function(data, encoding, done) {

  this.push(materializer(this.pattern, data));

  done();
};

module.exports = MaterializerStream;
