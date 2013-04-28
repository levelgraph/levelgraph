var Variable = require("./variable");
var Transform = require("stream").Transform;
var CallbackStream = require("./callbackstream");

function Navigator(options) {
  if (!(this instanceof Navigator)) {
    return new Navigator(options);
  }

  this.db = options.db;
  this.conditions = [];
  this.lastElement = options.start;

  var count = 0;
  this._nextVarId = function() {
    return "x" + count++;
  };
}

Navigator.prototype.archOut = function (predicate) {
  var variable = this.db.v(this._nextVarId());

  this.conditions.push({
    subject: this.lastElement,
    predicate: predicate,
    object: variable
  });

  this.lastElement = variable;

  return this;
};

Navigator.prototype.archIn = function (predicate) {
  var variable = this.db.v(this._nextVarId());

  this.conditions.push({
    subject: variable,
    predicate: predicate,
    object: this.lastElement
  });

  this.lastElement = variable;

  return this;
};

Navigator.prototype.as = function (name) {
  this.lastElement.name = name;
  return this;
};

Navigator.prototype.stream = function () {
  var stream = new NavigatorStream({ lastElement: this.lastElement });

  if (this.conditions.length === 0) {
    stream.end({});
    return stream;
  }

  return this.db.joinStream(this.conditions).
    pipe(stream);
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

  this.lastElement = options.lastElement;
}

NavigatorStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: NavigatorStream } }
);

NavigatorStream.prototype._transform = function(data, encoding, done) {
  var value = data[this.lastElement.name] || this.lastElement;
  this.push(value);
  done();
};

module.exports = Navigator;
