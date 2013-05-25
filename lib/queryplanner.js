
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
        doSortQueryPlan(result);
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

doSortQueryPlan = function(query) {
  var first = query[0]
    , second = query[1]
    , firstIndexes = utilities.possibleIndexes(Object.keys(utilities.queryMask(first)))
    , secondIndexes = utilities.possibleIndexes(Object.keys(utilities.queryMask(second)))
    , index;

  firstIndexes.filter(function(e) {
    return secondIndexes.indexOf(e) >= 0;
  });

  if (firstIndexes.length > 0) {
    first.index = firstIndexes[0];
    second.index = firstIndexes[0];
    first.stream = JoinStream;
    second.stream = SortJoinStream;
  }
};

module.exports = queryplanner;
