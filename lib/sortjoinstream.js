
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
      //console.log("source closed!", that.triple);
      that._sourceClosed = true;
    });
  });

  this._queryMask = queryMask(options.triple);

  this.index = options.preferiteIndex;
  //console.log(this._queryMask);
  //console.log(this.index);

  this._firstMatch = true;
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

  this._readStream = this.db.getStream(this._queryMask, { preferiteIndex: this.index });

  this._readStream.on("error", function(err) {
    that.emit("error", err);
  });

  this._readStream.on("end", function() {
    //console.log("stream closed!", that.triple, that._sourceClosed, that._previousTriple);

    that._readStream = null;
    if (that.start || (that._sourceClosed && !that._previousTriple) || that._toNextTriple) {
      that._execLastDone();
    } else {
      //console.log("not closing", that.triple);
    }

    if (that._toNextTriple) {
      //that._restart();
    }
  });

  this._readStream.on("readable", function() {
    if (that._toNextTriple) {
      that._toNextTriple();
    }
  });
};

SortJoinStream.prototype._execLastDone = function() {
  var that = this;
  if(that._lastDone) {
    //console.log("calling lastdone!", that._previousTriple, that.triple);
    var func = that._lastDone;
    that._toNextTriple = null;
    that._lastDone = null;
    func();
  }
};

SortJoinStream.prototype._flush = function(cb) {
  //console.log("flush!!");
  if (this._readStream && this._readStream.readable) {
    this._readStream.destroy();
  }

  this._execLastDone();

  cb();
};

SortJoinStream.prototype._nextTriple = function(cb, skip) {
  var that = this
    , triple
    , callCallback = function() {
        cb(that._previousTriple);
      };

  if (skip) {
    that._previousTriple = null;
  }

  if (that._previousTriple) {
    callCallback();
    return;
  }

  //console.log("read!!");
  that._previousTriple = that._readStream.read();

  if (!that._previousTriple) {
    that._toNextTriple = function() {
      that._previousTriple = that._readStream.read();
      callCallback();
    };
    return;
  }
  setImmediate(callCallback);
};


SortJoinStream.prototype._transform = function(context, encoding, done) {

  if (!this._readStream) {
    //this._restart();
    done();
  }

  //console.log("context arrived!", this.triple, context);
  var that = this

    , reCount = this.count++

    , matched = false

    , doRead = function(triple) {

        var newContext = that.matcher(context, triple)
          , key
          , otherKey;


        key = genKey(that.index, materializer(that.triple, context)) + "::\xff";
        //console.log(that.index, materializer(that.triple, context));
        //console.log(key);

        if (newContext) {
          //console.log("newContext!", that.triple, context, newContext);
          that.push(newContext);
          that._nextTriple(doRead, true);
          return;
        }

        //console.log("not maching context!", that.triple, context, triple);

        //console.log(that.index, materializer(that.triple, context));
        //console.log(that.index, triple);
        key = genKey(that.index, materializer(that.triple, context)) + "::\xff";
        otherKey = genKey(that.index, triple);

        if (key >= otherKey) {
          //console.log(key, ">", otherKey);
          that._nextTriple(doRead, true);
        } else {
          //console.log(key, "<", otherKey);
          that._lastDone = null;
          that._toNextTriple = null;
          //console.log("here done", that.triple);
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
