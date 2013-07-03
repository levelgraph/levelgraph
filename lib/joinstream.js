
var Transform = require("stream").Transform
  , Variable = require("./variable")
  , utilities = require("./utilities")
  , queryMask = utilities.queryMask
  , variablesMask = utilities.variablesMask
  , maskUpdater = utilities.maskUpdater
  , matcher = utilities.matcher;

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
  this._index = options.index;

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
  var readStream = this.db.getStream(newMask, { index: this._index });

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
