var Variable = require("./variable");
var Transform = require("stream").Transform;
var CallbackStream = require("./callbackstream");

function Navigator(options) {
  if (!(this instanceof Navigator)) {
    return new Navigator(options);
  }

  this.db = options.db;
  this._conditions = [];
  this._lastElement = options.start;
  this._initialContext = {};


  var count = 0;
  this._nextVarId = function() {
    return "x" + count++;
  };
}

Navigator.prototype.archOut = function (predicate) {
  var variable = this.db.v(this._nextVarId());

  this._conditions.push({
    subject: this._lastElement,
    predicate: predicate,
    object: variable
  });

  this._lastElement = variable;

  return this;
};

Navigator.prototype.archIn = function (predicate) {
  var variable = this.db.v(this._nextVarId());

  this._conditions.push({
    subject: variable,
    predicate: predicate,
    object: this._lastElement
  });

  this._lastElement = variable;

  return this;
};

Navigator.prototype.bind  = function (value) {
  this._initialContext[this._lastElement.name] = value;
  return this;
};

Navigator.prototype.as = function (name) {
  this._lastElement.name = name;
  return this;
};

Navigator.prototype.stream = function () {
  var stream = new NavigatorStream({
    _lastElement: this._lastElement
  });

  if (this._conditions.length === 0) {
    stream.end({});
    return stream;
  }

  var options = { context: this._initialContext };

  this.db.joinStream(this._conditions, options).
    pipe(stream);

  return stream;
};

Navigator.prototype.values = function (cb) {
  var that = this;
  var stream = this.stream();
  stream.pipe(CallbackStream({
    callback: function(err, results) {
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
    }
  }));

  return this;
};

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

module.exports = Navigator;
