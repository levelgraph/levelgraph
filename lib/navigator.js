var Variable = require("./variable")
  , Transform = require("./streamwrapper").Transform
  , CallbackStream = require("callback-stream")
  , wrapCallback = require("./utilities").wrapCallback;

function NavigatorStream(options) {
  if (!(this instanceof NavigatorStream)) {
    return new NavigatorStream(options);
  }

  options.objectMode = true;

  Transform.call(this, options);

  this._lastElement = options._lastElement;
}

NavigatorStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: NavigatorStream } }
);

NavigatorStream.prototype._transform = function(data, encoding, done) {
  var value = data[this._lastElement.name] || this._lastElement;
  this.push(value);
  done();
};

function Navigator(options) {
  if (!(this instanceof Navigator)) {
    return new Navigator(options);
  }

  this.db = options.db;
  this._conditions = [];
  this._initialContext = {};

  var count = 0;
  this._nextVar = function() {
    return this.db.v("x" + count++);
  };

  this.go(options.start);
}

function arch(varKey, lastKey) {
  return function(predicate) {
    var triple = {
      predicate: predicate
    };

    triple[varKey] = this._nextVar();
    triple[lastKey] = this._lastElement;

    this._conditions.push(triple);

    this._lastElement = triple[varKey];

    return this;
  };
}

Navigator.prototype.archOut = arch("object", "subject");
Navigator.prototype.archIn = arch("subject", "object");

Navigator.prototype.bind  = function (value) {
  this._initialContext[this._lastElement.name] = value;
  return this;
};

Navigator.prototype.as = function (name) {
  this._lastElement.name = name;
  return this;
};

Navigator.prototype.go = function (vertex) {
  if (!vertex) {
    vertex = this._nextVar();
  }
  this._lastElement = vertex;
  return this;
};

Navigator.prototype.triples = wrapCallback("triplesStream");

Navigator.prototype.triplesStream = function (pattern) {

  var stream = null;

  var options = {
    context: this._initialContext,
    materialized: pattern
  };
  stream = this.db.joinStream(this._conditions, options);

  return stream;
};

Navigator.prototype.contexts = Navigator.prototype.triples;
Navigator.prototype.contextsStream = Navigator.prototype.triplesStream;

Navigator.prototype.valuesStream = function () {
  var stream, options;
  
  stream = new NavigatorStream({
    _lastElement: this._lastElement
  });

  if (this._conditions.length === 0) {
    stream.end({});
    return stream;
  }

  options = { context: this._initialContext };

  this.db.joinStream(this._conditions, options).
    pipe(stream);

  return stream;
};

Navigator.prototype.values = function (cb) {
  var that = this
    , stream = this.valuesStream()
    , collect = function(err, results) {
        if (err) {
          cb(err);
          return;
        }

        results = results.reduce(function(acc, result) {
          if (acc.indexOf(result) < 0) {
            acc.push(result);
          }
          return acc;
        }, []);

        cb(null, results);
      };

  stream.pipe(new CallbackStream({
    objectMode: true
  }, collect));

  return this;
};

module.exports = Navigator;
