
var utilities = require("./utilities")
  , queryMask = utilities.queryMask
  , variablesMask = utilities.variablesMask
  , JoinStream = require("./joinstream")
  , SortJoinStream = require("./sortjoinstream")
  , doSortQueryPlan
  , async = require("async");

function orderedPossibleIndex(keys) {
  return Object.keys(utilities.defs).filter(function(index) {
    return keys.every(function(key, pos) {
      return utilities.defs[index][pos] === key;
    });
  });
}

function queryplanner(db, options) {
  return function planner(query, callback) {
    // dupes!
    var result = [].concat(query);

    async.each(query, function(q, cb) {
      var newq = queryMask(q)
        , range = utilities.createQuery(newq)
        , result = function(err, size) {
            if (err) {
              return cb(err);
            }
            q.size = size;
            cb();
          };

      try {
        db.approximateSize(range.start, range.end, result);
      } catch(err) {
        result(null, Object.keys(variablesMask(q)).length);
      }

    }, function(err) {
      if (err) {
        callback(err);
        return;
      }

      result.sort(function compare(a, b) {
        if (a.size < b.size) {
          return -1;
        }
        if (a.size > b.size) {
          return 1;
        }
        return 0;
      });

      result.forEach(function(q) {
        delete q.size;
      });

      if (options.joinAlgorithm === "sort" && result.length > 1) {
        result.reduce(doSortQueryPlan);
      }

      result.forEach(function(q) {
        if (!q.stream) {
          q.stream = JoinStream;
        }
      });

      callback(null, result);
    });
  };
}

doSortQueryPlan = function(first, second) {
  if (first === null || first.stream === JoinStream) {
    return null;
  }

  var firstQueryMask = utilities.queryMask(first)
    , secondQueryMask = utilities.queryMask(second)
    , firstVariablesMask = utilities.variablesMask(first)
    , secondVariablesMask = utilities.variablesMask(second)

    , firstVariables = Object.keys(firstVariablesMask).map(function(key) {
        return firstVariablesMask[key];
      })

    , secondVariables = Object.keys(secondVariablesMask).map(function(key) {
        return secondVariablesMask[key];
      })
      
    , variableKey = function(obj, variable) {
        return Object.keys(obj).filter(function(key) {
          return obj[key].name === variable.name;
        })[0];
      }

    , commonVariables = firstVariables.filter(function(firstVar) {
        return secondVariables.some(function(secondVar) {
          return firstVar.name === secondVar.name;
        });
      })
    , firstIndexArray = Object.keys(firstQueryMask)
    , secondIndexArray = Object.keys(secondQueryMask)
    , firstIndexes
    , secondIndexes;

  if (commonVariables.length === 0) {
    return null;
  }

  first.stream = first.stream ? first.stream : JoinStream;

  firstIndexArray.sort();
  secondIndexArray.sort();

  commonVariables.sort(function(a, b) {
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
      return 1;
    } else {
      return 0;
    }
  });

  commonVariables.forEach(function(commonVar) {
    firstIndexArray.push(variableKey(firstVariablesMask, commonVar));
    secondIndexArray.push(variableKey(secondVariablesMask, commonVar));
  });

  firstIndexes = orderedPossibleIndex(firstIndexArray);
  secondIndexes = orderedPossibleIndex(secondIndexArray);

  first.index = first.index || firstIndexes[0];
  second.index = secondIndexes[0];
  second.stream = SortJoinStream;

  return second;
};

module.exports = queryplanner;
