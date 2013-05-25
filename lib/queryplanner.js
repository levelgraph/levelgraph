
var utilities = require("./utilities")
  , queryMask = utilities.queryMask
  , JoinStream = require("./joinstream")
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
        q.stream = JoinStream;
      });

      callback(null, result);
    });
  };
}

module.exports = queryplanner;
