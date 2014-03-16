
var CallbackStream = require('callback-stream')
  , Variable       = require('./variable')
  , defs = {
      spo: ['subject', 'predicate', 'object'],
      sop: ['subject', 'object', 'predicate'],
      pos: ['predicate', 'object', 'subject'],
      pso: ['predicate', 'subject', 'object'],
      ops: ['object', 'predicate', 'subject'],
      osp: ['object', 'subject', 'predicate']
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
  var result = key, def = defs[key], value, i;

  for (i = 0; (value = triple[def[i]]) !== null &&
              value !== undefined; i++) {
    result += '::' + value;
  }

  if (i < 3) {
    result += '::';
  }

  return result;
}

module.exports.genKey = genKey;

var defKeys = Object.keys(defs);
function genKeys(triple) {
  var i, result = [];

  for (i = 0; i < defKeys.length; i++) {
    result.push(genKey(defKeys[i], triple));
  }

  return result;
}

module.exports.genKeys = genKeys;

function possibleIndexes(types) {
  var result = Object.keys(defs).filter(function(key) {
    var matches = 0;
    return defs[key].every(function (e, i) {
      if (types.indexOf(e) >= 0) {
        matches++;
        return true;
      }

      if (matches === types.length) {
        return true;
      }
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

function typesFromPattern(pattern) {
  return Object.keys(pattern).filter(function(key) {
    switch(key) {
      case 'subject':
        return !!pattern.subject;
      case 'predicate':
        return !!pattern.predicate;
      case 'object':
        return !!pattern.object;
      default:
        return false;
    }
  });
}

function createQuery(pattern, options) {
  var types = typesFromPattern(pattern)
    , preferiteIndex = options && options.index
    , index = findIndex(types, preferiteIndex)
    , key = genKey(index, pattern, '')
    , limit = pattern.limit
    , query = {
          start: key
        , end: key + '\xff'
        , fillCache: true
        , limit: typeof limit === 'number' && limit || -1
        , highWaterMark: 16
        , valueEncoding: 'json'
      };

  return query;
}

module.exports.createQuery = createQuery;

function generateBatch(triple, action) {
  if (!action) {
    action = 'put';
  }
  var json = JSON.stringify(triple);
  return genKeys(triple).map(function(key) {
    return { type: action, key: key, value: json };
  });
}

module.exports.generateBatch = generateBatch;

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

(function() {
  var a, b, c;

  a = function(key) {
    return defs.spo.indexOf(key) >= 0;
  };

  b = function(triple, key) {
    return typeof triple[key] !== 'object';
  };

  c = function(triple, key) {
    return triple[key] instanceof Variable;
  };

  var objectMask = function objectMask(criteria, object) {
    return Object.keys(object).
      filter(a).
      filter(function(key) {
        return criteria(object, key);
      }).
      reduce(function(acc, key) {
        acc[key] = object[key];
        return acc;
      },
    {});
  };

  module.exports.queryMask = function queryMask(object) {
    return objectMask(b, object);
  };

  module.exports.variablesMask = function variablesMask(object) {
    return objectMask(c, object);
  };
})();

var variablesMask = module.exports.variablesMask;

function maskUpdater(pattern) {
  var variables = variablesMask(pattern);
  return function(solution, mask) {
    return Object.keys(variables).reduce(function(newMask, key) {
      var variable = variables[key];
      if (variable.isBound(solution)) {
        newMask[key] = solution[variable.name];
      }
      newMask.filter = pattern.filter;
      return newMask;
    }, Object.keys(mask).reduce(function(acc, key) {
      acc[key] = mask[key];
      return acc;
    }, {}));
  };
}

module.exports.maskUpdater = maskUpdater;

function matcher(pattern) {
  var variables = variablesMask(pattern);

  return function realMatcher(solution, triple) {
    var key, bindable = true, newsolution = solution;

    for (key in variables) {
      if (newsolution && variables.hasOwnProperty(key)) {
        newsolution = variables[key].bind(newsolution, triple[key]);
      }
    }

    return newsolution;
  };
}

module.exports.matcher = matcher;

function patchApproximateSize(leveldb) {
  // we need to be sublevel-aware
  var db = leveldb.db || leveldb._root.db;

  // monkey patching _approximateSize
  // see https://github.com/maxogden/level.js/pull/21
  function doPatch(db) {
    if (db.constructor.name === 'Level') {
      // we are in Level-js
      db._approximateSize = function(a, b, callback) {
        var err = new Error('Not implemented');
        if (callback) {
          return callback(err);
        }

        throw err;
      };
    }
  }

  if (db.constructor.name === 'DeferredLevelDOWN') {
    db.setDb = function() {
      doPatch(arguments[0]);
      var result = db.constructor.prototype.setDb.apply(db, arguments);
      return result;
    };
  } else {
    doPatch(db);
  }
}

module.exports.patchApproximateSize = patchApproximateSize;
