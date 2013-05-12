
var CallbackStream = require("callback-stream")
  , Variable       = require("./variable")
  , defs = {
      spo: ["subject", "predicate", "object"],
      sop: ["subject", "object", "predicate"],
      pso: ["predicate", "object", "subject"],
      pos: ["predicate", "subject", "object"],
      ops: ["object", "predicate", "subject"],
      osp: ["object", "subject", "predicate"]
    };

module.exports.defs = defs;

function wrapCallback(method) {
  return function(query, cb) {
    var args = Array.prototype.slice.call(arguments, 0)
      , callback = args.pop()
      , stream = null;

    stream = this[method].apply(this, args);

    stream.pipe(new CallbackStream({ objectMode: true }, callback));
  };
}

module.exports.wrapCallback = wrapCallback;

function genKey(key, triple) {
  return [key].concat(defs[key].map(function(t) {
    return triple[t];
  })).filter(function(e) {
    return e !== null && e !== undefined;
  }).join("::");
}

module.exports.genKey = genKey;

function genKeys(triple) {
  return Object.keys(defs).map(function(key) {
    return genKey(key, triple);
  });
}

module.exports.genKeys = genKeys;

function filterDefsGiven(types) {
  var result = Object.keys(defs).filter(function(key) {
    return types.every(function (e, i) {
      return defs[key][i] === e;
    });
  });

  return result;
}

function createQuery(pattern) {
  var types = Object.keys(pattern)
    , possibleDefs = filterDefsGiven(types)
    , key = genKey(possibleDefs[0], pattern)
    , query = {
        start: key,
        fillCache: true
      };

  return query;
}

module.exports.createQuery = createQuery;

function genActions(action, triple) {
  var json = JSON.stringify(triple);
  return genKeys(triple).map(function(key) {
    return { type: action, key: key, value: json };
  });
}

module.exports.genActions = genActions;

var objectMask = function(criteria, object) {
  return Object.keys(object).
    filter(function(key) {
      return criteria(object, key);
    }).
    reduce(function(acc, key) {
      acc[key] = object[key];
      return acc;
    },
  {});
};

module.exports.queryMask = objectMask.bind(null, function(triple, key) {
  return typeof triple[key] !== "object";
});

module.exports.variablesMask = objectMask.bind(null, function(triple, key) {
  return triple[key] instanceof Variable;
});
