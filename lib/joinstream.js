
var Transform = require("stream").Transform;
var Variable = require("./variable");
var ContextBinderStream = require("./contextbinderstream");

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
  this.db = options.db;

  var that = this;
  this.once("pipe", function(source) {
    source.on("error", function(err) {
      that.emit("error", err);
    });
  });
}

JoinStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: JoinStream } }
);

JoinStream.prototype._transform = function(context, encoding, done) {

  var that = this;

  var newMask = this.maskUpdater(context, this.mask);
  var readStream = this.db.getStream(newMask);

  var binderStream = new ContextBinderStream({
    matcher: this.matcher,
    context: context
  });

  binderStream.on("context", function(context) {
    that.push(context);
  });

  readStream.on("error", function(err) {
    that.emit("error", err);
  });

  readStream.pipe(binderStream);

  readStream.on("end", done);
};

module.exports = JoinStream;

function objectMask(criteria, object) {
  return Object.keys(object).
    filter(function(key) {
      return criteria(object, key);
    }).
    reduce(function(acc, key) {
      acc[key] = object[key];
      return acc;
    },
  {});
}

var queryMask = objectMask.bind(null, function(triple, key) {
  return typeof triple[key] !== 'object';
});

variablesMask = objectMask.bind(null, function(triple, key) {
  return triple[key] instanceof Variable;
});

function matcher(pattern) {
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
}

function maskUpdater(pattern) {
  var variables = variablesMask(pattern);
  return function(context, mask) {
    return Object.keys(variables).reduce(function(newMask, key) {
      var variable = variables[key];
      if (variable.isBound(context)) {
        newMask[key] = context[variable.name];
      }
      return newMask;
    }, mask);
  };
}
