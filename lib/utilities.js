
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

// needed to avoid deopt
function addToArray(result, element) {
  if (element) {
    result.push(element);
  }
}

function genKey(key, triple) {
  var result = [key], def = defs[key];
  for (var i = 0; i < def.length; i++) {
    addToArray(result, triple[def[i]]);
  }

  if (result.length < 4) {
    result.push('');
  }

  return result.join('::');
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
      case 'predicate':
      case 'object':
        return true;
      default:
        return false;
    }
  });
}

function createQuery(pattern, options) {
  var types = typesFromPattern(pattern)
    , preferiteIndex = (options || {}).index
    , index = findIndex(types, preferiteIndex)
    , key = genKey(index, pattern)
    , query = {
          start: key
        , end: key + '\xff'
        , fillCache: true
        , filter: pattern.filter
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

function maskUpdater(pattern) {
  var variables = module.exports.variablesMask(pattern);
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
