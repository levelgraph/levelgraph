/*
Copyright (c) 2013-2017 Matteo Collina and LevelGraph Contributors

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

var utilities = require('./utilities')
  , queryMask = utilities.queryMask
  , variablesMask = utilities.variablesMask
  , JoinStream = require('./joinstream')
  , SortJoinStream = require('./sortjoinstream')
  , doSortQueryPlan
  , steed = require('steed');

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

    steed.each(query, function(q, cb) {
      var newq = queryMask(q)
        , range = utilities.createQuery(newq);

      if (db.db && db.db.approximateSize) {
        db.db.approximateSize(range.start, range.end, function(err, size) {
          if (err) {
            size = Object.keys(variablesMask(q)).length;
          }
          q.size = size;
          process.nextTick(cb);
        });
      } else {
        q.size = Object.keys(variablesMask(q)).length;
        process.nextTick(cb);
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

      if (options.joinAlgorithm === 'sort' && result.length > 1) {
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

    , commonValueKeys = firstIndexArray.filter(function(key) {
        return secondIndexArray.indexOf(key) >= 0;
      })

    , firstIndexes
    , secondIndexes;

  if (commonVariables.length === 0) {
    return null;
  }

  first.stream = first.stream ? first.stream : JoinStream;

  firstIndexArray = firstIndexArray.filter(function(key) {
    return commonValueKeys.indexOf(key) < 0;
  });

  secondIndexArray = secondIndexArray.filter(function(key) {
    return commonValueKeys.indexOf(key) < 0;
  });

  commonValueKeys.forEach(function(key) {
    firstIndexArray.unshift(key);
    secondIndexArray.unshift(key);
  });

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
