
var Transform = require("stream").Transform
  , Variable = require("./variable")
  , queryMask = require("./utilities").queryMask
  , variablesMask = require("./utilities").variablesMask
  , maskUpdater
  , matcher
  , materializer = require("./utilities").materializer
  , createQuery = require("./utilities").createQuery
  , genKey = require("./utilities").genKey
  , genKeys = require("./utilities").genKeys;

var counter = 0;

function SortJoinStream(options) {
  if (!(this instanceof SortJoinStream)) {
    return new SortJoinStream(options);
  }

  console.log(options);

  options.objectMode = true;

  Transform.call(this, options);
  
  this.triple = options.triple;
  this.matcher = matcher(options.triple);
  this.db = options.db;

  var that = this;
  this.once("pipe", function(source) {
    source.on("error", function(err) {
      that.emit("error", err);
    });

    source.on("end", function() {
      console.log("source closed!", that.triple);
    });
  });

  this._queryMask = queryMask(options.triple);

  this.index = options.index;
  //console.log(this._queryMask);
  //console.log(this.index);

  this._previousTriple = null;
  this._lastDone = null;
  this._restart();
}

SortJoinStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: SortJoinStream } }
);

SortJoinStream.prototype._restart = function() {
  //console.log("restart!!");
  var that = this;

  this._readStream = this.db.getStream(this._queryMask, { index: this.index });

  this._readStream.on("error", function(err) {
    console.log("readStreamError", triple, err);
    that.emit("error", err);
  });

  this._readStream.on("end", function() {
    console.log("stream closed!", that.triple, that._lastDone);

    that._readStream = null;
    that._execLastDone();
  });

  this._readStream.on("readable", function() {
    console.log("readable!", that.triple);
    if (that._toNextTriple) {
      console.log("executig toNextTriple");
      that._toNextTriple();
    }
  });
};

SortJoinStream.prototype._execLastDone = function() {
  var that = this;
  if(that._lastDone) {
    console.log("last done!!", this.triple);
    var func = that._lastDone;
    that._toNextTriple = null;
    that._lastDone = null;
    func();
  }
};

SortJoinStream.prototype._flush = function(cb) {
  console.log("flush!!", this.triple);
  var that = this;

  this._execLastDone();

  if (this._readStream && this._readStream.readable) {
    console.log("destroying!", this.triple, this._toNextTriple, this.index);
    that._readStream.destroy();
  }

  setImmediate(cb);
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


SortJoinStream.prototype._transform = function(context, encoding, done) {

  if (!this._readStream && !this._previousTriple) {
    done();
    return;
  }

  //console.log("context arrived!", this.triple, context);
  var that = this

    , reCount = this.count++

    , matched = false

    , doRead = function(triple) {

        console.log("triple", triple);

        var newContext = that.matcher(context, triple)
          , key
          , otherKey;

        console.log("originalQueryMask", that._queryMask);
        console.log("query", that.triple);
        console.log("newContext", newContext);


        key = genKey(that.index, materializer(that.triple, context)) + "::\xff";
        //console.log(that.index, materializer(that.triple, context));
        //console.log(key);

        if (newContext) {
          console.log("newContext!", that.triple, context, newContext);
          that.push(newContext);
          that._nextTriple(doRead, true);
          return;
        }

        console.log("not maching context!", that.triple, context, triple);

        //console.log(that.index, materializer(that.triple, context));
        //console.log(that.index, triple);
        key = genKey(that.index, materializer(that.triple, context)) + "::\xff";
        otherKey = genKey(that.index, triple);

        if (key >= otherKey) {
          console.log(key, ">", otherKey);
          that._nextTriple(doRead, true);
        } else {
          console.log(key, "<", otherKey);
          that._lastDone = null;
          that._toNextTriple = null;
          console.log("here done", that.triple);
          done();
        }
      };

  this._lastDone = done;
  this._nextTriple(doRead);
};

module.exports = SortJoinStream;

matcher = function(pattern) {
  var variables = variablesMask(pattern);
  return function(context, triple) {
    var bindable = Object.keys(variables).every(function(key) {
      var variable = variables[key];
      return variable.isBindable(context, triple[key]);
    });

    if (!bindable) {
      return false;
    }
  
    return Object.keys(variables).reduce(function(newContext, key) {
      var variable = variables[key];
      return variable.bind(newContext, triple[key]);
    }, context);
  };
};

maskUpdater = function(pattern) {
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
};
