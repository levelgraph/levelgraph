
var Transform = require("stream").Transform;
var queryMask = require("./utilities").queryMask;
var variablesMask = require("./utilities").variablesMask;
var matcher = require("./utilities").matcher;

function JoinStream(options) {
  if (!(this instanceof JoinStream)) {
    return new JoinStream(options);
  }

  options.objectMode = true;

  Transform.call(this, options);
  
  this.triple = options.triple;
  this.matcher = matcher(options.triple);
  this.mask = queryMask(options.triple);
  this.maskUpdater = maskUpdater(options.triple);
  this.db = options.db;

  var that = this;
  this.once("pipe", function(source) {
    source.on("error", function(err) {
      that.emit("error", err);
    });
  });
}

JoinStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: JoinStream } }
);

JoinStream.prototype._transform = function(context, encoding, done) {

  var that = this;

  var newMask = this.maskUpdater(context, this.mask);
  var readStream = this.db.getStream(newMask);

  readStream.on("data", function(triple) {
    var newContext = that.matcher(context, triple);

    if (newContext) {
      that.push(newContext);
    }
  });

  readStream.on("error", function(err) {
    that.emit("error", err);
  });

  readStream.on("end", done);
};

module.exports = JoinStream;

function maskUpdater(pattern) {
  var variables = variablesMask(pattern);
  return function(context, mask) {
    return Object.keys(variables).reduce(function(newMask, key) {
      var variable = variables[key];
      if (variable.isBound(context)) {
        newMask[key] = context[variable.name];
      }
      return newMask;
    }, Object.keys(mask).reduce(function(acc, key) {
      acc[key] = mask[key];
      return acc;
    }, {}));
  };
}
