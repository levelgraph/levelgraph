
var Transform = require('./streamwrapper').Transform
  , Variable = require('./variable')
  , utilities = require('./utilities')
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
  this.limit = options.limit;
  this._limitCounter = 0;
  this.offset = options.offset;
  this._offsetCounter = 0;
  this.db = options.db;
  this._index = options.index;
  this._ended = false;

  var that = this;
  this.once('pipe', function(source) {
    source.on('error', function(err) {
      that.emit('error', err);
    });
  });

  this._onDataStream = function onDataStream(triple) {
    var newsolution = that.matcher(that._lastSolution, triple);

    if (that._ended || !newsolution) {
      return;
    }

    if (!that.offset || ++that._offsetCounter > that.offset) {
      that.push(newsolution);
    }

    if (that.limit && ++that._limitCounter === that.limit) {
      that._readStream.destroy();
      that._ended = true;
    }
  };

  this._indexPreferences = { index: this._index };

  this._onErrorStream = function onErrorStream(err) {
    that.emit('error', err);
  };
}

JoinStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: JoinStream } }
);

JoinStream.prototype._transform = function transform(solution, encoding, done) {
  if (this._ended) {
    return done();
  }

  var that = this
    , newMask = this.maskUpdater(solution, this.mask);

  that._lastSolution = solution;
  that._readStream = this.db.getStream(newMask, this._indexPreferences);

  that._readStream.on('data', that._onDataStream);
  that._readStream.on('error', that._onErrorStream);
  that._readStream.on('end', done);
};

module.exports = JoinStream;
