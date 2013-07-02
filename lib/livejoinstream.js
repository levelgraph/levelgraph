
var Readable = require("stream").Readable
  , Variable = require("./variable")
  , utilities = require("./utilities")
  , queryMask = utilities.queryMask
  , createQuery = utilities.createQuery
  , variablesMask = utilities.variablesMask
  , matcher = utilities.matcher;

function LiveJoinStream(options) {
  if (!(this instanceof LiveJoinStream)) {
    return new LiveJoinStream(options);
  }

  options.objectMode = true;

  Readable.call(this, options);
  
  this.triple = options.triple;
  this.matcher = matcher(options.triple);
  this.query = createQuery(queryMask(options.triple));
  this.db = options.db;
  this._index = options.index;

  var that = this;

  this._queue = [];
  this._remover = this.db._leveldb.hooks.post(this.query, function(data) {
    console.log(data);
    var triple = data.value
      , newContext = that.matcher({}, JSON.parse(data.value));

    if (newContext) {
      console.log(that.push(newContext));
    }
  });
}

LiveJoinStream.prototype = Object.create(
  Readable.prototype,
  { constructor: { value: LiveJoinStream } }
);

LiveJoinStream.prototype.pipe = function(dest) {
  var that = this;
  dest.on("finish", function() {
    that._remover();
    that.emit("close");
  });
  return Readable.prototype.pipe.call(this, dest);
};

LiveJoinStream.prototype._read = function(bytes) {
  // nothing to do here, we will emit when new data
  // is fetched
};

module.exports = LiveJoinStream;
