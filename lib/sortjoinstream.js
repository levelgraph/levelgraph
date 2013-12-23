
var Transform = require('./streamwrapper').Transform
  , Variable = require('./variable')
  , utilities = require('./utilities')
  , queryMask = utilities.queryMask
  , variablesMask = utilities.variablesMask
  , matcher = utilities.matcher
  , materializer = utilities.materializer
  , createQuery = utilities.createQuery
  , genKey = utilities.genKey
  , genKeys = utilities.genKeys;

var counter = 0;

function SortJoinStream(options) {
  if (!(this instanceof SortJoinStream)) {
    return new SortJoinStream(options);
  }

  options.objectMode = true;

  Transform.call(this, options);
  
  this.triple = options.triple;
  this.matcher = matcher(options.triple);
  this.db = options.db;

  var that = this;
  this.once('pipe', function(source) {
    source.on('error', function(err) {
      that.emit('error', err);
    });
  });

  this._queryMask = queryMask(options.triple);
  this._queryMask.filter = options.triple.filter;

  this.index = options.index;

  this._previousTriple = null;
  this._lastDone = null;
  this._restart();
  this.limit = options.limit;
  this._limitCounter = 0;
  this.offset = options.offset;
  this._offsetCounter = 0;
}

SortJoinStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: SortJoinStream } }
);

SortJoinStream.prototype._restart = function() {
  var that = this;

  this._readStream = this.db.getStream(this._queryMask, { index: this.index });

  this._readStream.on('error', function(err) {
    that.emit('error', err);
  });

  this._readStream.on('end', function() {
    that._readStream = null;
    that._execLastDone();
  });

  this._readStream.on('readable', function() {
    if (that._toNextTriple) {
      that._toNextTriple();
    }
  });
};

SortJoinStream.prototype._execLastDone = function() {
  var that = this;
  if(that._lastDone) {
    var func = that._lastDone;
    that._toNextTriple = null;
    that._lastDone = null;
    func();
  }
};

SortJoinStream.prototype._flush = function(cb) {
  var that = this;

  this._execLastDone();

  if (this._readStream && this._readStream.readable) {
    that._readStream.destroy();
  }

  cb();
};

SortJoinStream.prototype._nextTriple = function(cb, skip) {
  var that = this
    , triple
    , callCallback = function() {
        if (!that._previousTriple && that._readStream) {
          that._previousTriple = that._readStream.read();
        } else if (!that._readStream && that._lastDone) {
          that._execLastDone();
        }
        that._toNextTriple = null;

        if (that._previousTriple) {
          cb(that._previousTriple);
        } else {
          that._toNextTriple = callCallback;
        }
      };

  if (skip) {
    that._previousTriple = null;
  }

  callCallback();
};


SortJoinStream.prototype._transform = function(solution, encoding, done) {

  if (!this._readStream && !this._previousTriple) {
    done();
    return;
  }

  var that = this

    , reCount = this.count++

    , matched = false

    , doRead = function(triple) {

        var newsolution = that.matcher(solution, triple)
          , key
          , otherKey;

        key = genKey(that.index, materializer(that.triple, solution)) + '::\xff';

        if (newsolution) {
          if (!that.offset || ++that._offsetCounter > that.offset) {
            that.push(newsolution);
          }

          if (that.limit && ++that._limitCounter === that.limit) {
            that._readStream.destroy();
          } else {
            that._nextTriple(doRead, true);
          }
          return;
        }

        key = genKey(that.index, materializer(that.triple, solution)) + '::\xff';
        otherKey = genKey(that.index, triple);

        if (key >= otherKey) {
          that._nextTriple(doRead, true);
        } else {
          that._lastDone = null;
          that._toNextTriple = null;
          done();
        }
      };

  this._lastDone = done;
  this._nextTriple(doRead);
};

module.exports = SortJoinStream;
