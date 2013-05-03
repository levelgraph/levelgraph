
var Transform = require("stream").Transform
  , Variable = require("./variable");

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

  var pattern = this.pattern;

  this.push(Object.keys(pattern).
            reduce(function(result, key) {
    if (pattern[key] instanceof Variable) {
      result[key] = data[pattern[key].name];
    } else {
      result[key] = pattern[key];
    }

    return result;
  }, {}));

  done();
};

module.exports = MaterializerStream;
