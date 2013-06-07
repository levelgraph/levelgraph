
var utilities = require("./utilities")
  , queryMask = utilities.queryMask
  , JoinStream = require("./joinstream")
  , SortJoinStream = require("./sortjoinstream")
  , doSortQueryPlan
  , async = require("async");

function queryplanner(db, options) {
  return function planner(query, callback) {
    // dupes!
    var result = [].concat(query);

    async.parallel(query.map(function(q) {
      return function(cb) {
        var newq = queryMask(q)
          , start = utilities.createQuery(newq).start;

        db.approximateSize(start + "::", start + "\xff", function(err, size) {
          if (err) {
            callback(err);
            return;
          }
          q.size = size;
          cb();
        });
      };
    }), function(err) {
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
        //doSortQueryPlan(result);
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

    , firstIndexes = utilities.possibleIndexes(Object.keys(firstQueryMask))
    , secondIndexes = utilities.possibleIndexes(Object.keys(secondQueryMask))

    , firstVariables = Object.keys(firstVariablesMask).map(function(key) {
        return firstVariablesMask[key];
      })

    , secondVariables = Object.keys(secondVariablesMask).map(function(key) {
        return secondVariablesMask[key];
      })

    , commonVariables = firstVariables.filter(function(firstVar) {
        return secondVariables.some(function(secondVar) {
          return firstVar.name === secondVar.name;
        });
      })
      
    , commonIndexes = firstIndexes.filter(function(e) {
        return secondIndexes.indexOf(e) >= 0;
      })
      
    //, commonKeys = ["subject", "predicate", "object"].filter(function(key) {
    //    if (firstQueryMask[key] === undefined) {
    //      return false;
    //    }
    //    console.log(firstQueryMask[key], secondQueryMask[key]);
    //    return firstQueryMask[key] === secondQueryMask[key];
    //  })

    , variableKey = function(obj, variable) {
        return Object.keys(obj).filter(function(key) {
          return obj[key].name === variable.name;
        })[0];
      }

    , sameVariables = firstVariables.length === commonVariables.length && secondVariables.length === commonVariables.length

    , commonVariablesKeys = commonVariables.every(function(v) {
        console.log("commonVariablesKeys");
        console.log(variableKey(first, v), variableKey(second, v));
        return variableKey(first, v) === variableKey(second, v);
      })
      
    , firstIndexPosition;

  first.stream = first.stream ? first.stream : JoinStream;

  if (first.index) {

    commonIndexes.forEach(function(index, pos) {
      if (index === first.index) {
        firstIndexPosition = pos;
      }
    });

    console.log(firstIndexPosition);

    if (firstIndexPosition >= 0) {
      console.log("first.index", first.index);
      console.log("commonIndexes", commonIndexes);
      commonIndexes = commonIndexes.splice(firstIndexPosition, 1).concat(commonIndexes);
      console.log("commonIndexes", commonIndexes);
      commonVariablesKeys = false;
    }
    //else {
    //  console.log("ahahah");
    //  return null;
    //}

  } else {
    first.index = commonIndexes[0];
  }

  console.log("firstIndexes", firstIndexes);
  console.log("secondIndexes", secondIndexes);
  console.log("commonIndexes", commonIndexes);
  console.log("commonVariables", commonVariables);
  console.log("commonVariablesKeys", commonVariablesKeys);

  if (!commonVariablesKeys && commonIndexes.length > 1) {
    second.index = commonIndexes[1];
    second.stream = SortJoinStream;
    return second;
  }

  if (commonIndexes.length > 0) {
    second.index = commonIndexes[0];
    second.stream = SortJoinStream;
    return second;
  }

  return null;
};

module.exports = queryplanner;
