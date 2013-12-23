
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
  this.db = options.db;
  this._index = options.index;
  this._ended = false;

  var that = this;
  this.once('pipe', function(source) {
    source.on('error', function(err) {
      that.emit('error', err);
    });
  });
}

JoinStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: JoinStream } }
);

JoinStream.prototype._transform = function(solution, encoding, done) {
  if (this._ended) {
    return done();
  }

  var that = this
    , newMask = this.maskUpdater(solution, this.mask)
    , readStream = this.db.getStream(newMask, { index: this._index });

  readStream.on('data', function(triple) {
    var newsolution = that.matcher(solution, triple);

    if (that._ended) {
      return;
    }

    if (newsolution) {
      that.push(newsolution);

      if (that.limit && ++that._limitCounter === that.limit) {
        readStream.destroy();
        that._ended = true;
      }
    }
  });

  readStream.on('error', function(err) {
    that.emit('error', err);
  });

  readStream.on('end', done);
};

module.exports = JoinStream;
