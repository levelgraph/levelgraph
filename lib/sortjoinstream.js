/*
Copyright (c) 2013-2017 Matteo Collina and LevelGraph Contributors

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

var Transform = require('readable-stream').Transform
  , Variable = require('./variable')
  , utilities = require('./utilities')
  , inherits = require('inherits')
  , defs = utilities.defs
  , queryMask = utilities.queryMask
  , variablesMask = utilities.variablesMask
  , matcher = utilities.matcher
  , materializer = utilities.materializer
  , createQuery = utilities.createQuery
  , escape = utilities.escape
  , genKey = utilities.genKey
  , genKeys = utilities.genKeys;

function genKeyWithEnding(key, triple) {
  var result = key, def = defs[key], value, i;

  for (i = 0; (value = triple[def[i]]) !== null &&
              value !== undefined; i++) {
    result += '::' + escape(value);
  }

  if (i < 3) {
    result += '::\udbff\udfff';
  }

  return result;
}

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
  this._start();
  this.limit = options.limit;
  this._limitCounter = 0;
}

inherits(SortJoinStream, Transform);

SortJoinStream.prototype._nextTriple = function nextTriple(skip) {
  var triple;

  if (skip) {
    this._previousTriple = null;
  }

  if (!this._previousTriple && this._readStream) {
    this._previousTriple = this._readStream.read();
  }

  if (this._previousTriple) {
    this._doRead(this._previousTriple);
  } else if (!this._readStream) {
    this.push(null);
  }
};

SortJoinStream.prototype._start = function() {
  var that = this;

  this._readStream = this.db.getStream(this._queryMask, { index: this.index });

  this._readStream.on('error', function(err) {
    that.emit('error', err);
  });

  this._readStream.on('close', function() {
    that._readStream = null;
    if (!that._previousTriple) {
      that._execLastDone();
    }
  });

  this._readStream.on('readable', function() {
    if (that._lastDone) {
      that._nextTriple();
    }
  });
};

SortJoinStream.prototype._execLastDone = function() {
  var that = this;
  if(that._lastDone) {
    var func = that._lastDone;
    that._lastDone = null;
    func();
  }
};

SortJoinStream.prototype._flush = function(cb) {
  var that = this;

  this._execLastDone();

  if (this._readStream) {
    that._readStream.destroy();
  }

  this.push(null);

  cb();
};

SortJoinStream.prototype._transform = function(solution, encoding, done) {
  this._lastSolution = solution;
  this._lastDone = done;
  this._nextTriple(false);
};

SortJoinStream.prototype._doRead = function doRead(triple) {

  var newsolution = this.matcher(this._lastSolution, triple)
    , key
    , otherKey
    , done = this._lastDone;

  key = genKeyWithEnding(this.index, materializer(this.triple, this._lastSolution));
  otherKey = genKey(this.index, triple);

  if (newsolution) {
    this.push(newsolution);

    if (this.limit && ++this._limitCounter === this.limit) {
      this._previousTriple = null;
      this._execLastDone();
      this._readStream.destroy();
      this._readStream = null;
      return;
    }
  }

  if (key > otherKey) {
    this._nextTriple(true);
  } else {
    this._lastDone = null;
    done();
  }
};

module.exports = SortJoinStream;
