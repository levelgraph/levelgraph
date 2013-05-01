
var Variable = require("./variable");
var CallbackStream = require("./callbackstream");

function wrapCallback(method) {
  return function(query, cb) {
    var args = Array.prototype.slice.call(arguments, 0);
    var callback = args.pop();
    var stream = null;

    stream = this[method].apply(this, args);

    stream.pipe(CallbackStream({ callback: callback }));
  };
}

module.exports.wrapCallback = wrapCallback;

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
module.exports.queryMask = queryMask;

var variablesMask = objectMask.bind(null, function(triple, key) {
  return triple[key] instanceof Variable;
});
module.exports.variablesMask = variablesMask;

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
module.exports.matcher = matcher;
