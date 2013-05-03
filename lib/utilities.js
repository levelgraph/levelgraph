
var defs = {
  spo: ["subject", "predicate", "object"],
  sop: ["subject", "object", "predicate"],
  pso: ["predicate", "subject", "object"],
  pos: ["predicate", "object", "subject"],
  ops: ["object", "predicate", "subject"],
  osp: ["object", "subject", "predicate"]
};

module.exports.defs = defs;

var CallbackStream = require("./callbackstream")
  , Variable = require("./variable");

function wrapCallback(method) {
  return function(query, cb) {
    var args = Array.prototype.slice.call(arguments, 0)
      , callback = args.pop()
      , stream = null;

    stream = this[method].apply(this, args);

    stream.pipe(new CallbackStream({ callback: callback }));
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

function possibleIndexes(types) {
  var result = Object.keys(defs).filter(function(key) {
    return types.every(function (e, i) {
      return defs[key][i] === e;
    });
  });

  result.sort();

  return result;
}

module.exports.possibleIndexes = possibleIndexes;

function findIndex(types, preferiteIndex) {
  var result = possibleIndexes(types)
    , index
    , there;

  there = result.some(function(r) {
    return r === preferiteIndex;
  });

  if (preferiteIndex && there) {
    index = preferiteIndex;
  } else {
    index = result[0];
  }

  return index;
}

module.exports.findIndex = findIndex;

function createQuery(pattern, options) {
  var types = Object.keys(pattern)
    , preferiteIndex = (options || {}).preferiteIndex
    , index = findIndex(types, preferiteIndex)
    , key = genKey(index, pattern)
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

function materializer(pattern, data) {
  return Object.keys(pattern)
               .reduce(function(result, key) {

    if (pattern[key] instanceof Variable) {
      result[key] = data[pattern[key].name];
    } else {
      result[key] = pattern[key];
    }

    return result;
  }, {});
}

module.exports.materializer = materializer;

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

module.exports.queryMask = objectMask.bind(null, function(triple, key) {
  return typeof triple[key] !== "object";
});

module.exports.variablesMask = objectMask.bind(null, function(triple, key) {
  return triple[key] instanceof Variable;
});
