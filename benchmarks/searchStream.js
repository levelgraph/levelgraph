var level = require("level-test")()

  , levelgraph = require("../")

  , db = levelgraph(level())

  , startCounts = 100000
  , counts = startCounts

  , startTime
  , endTime

  , vertexes = ["a", "b"]

  , doWrites = function() {
      if(--counts === 0) {
        startTime = new Date();
        doReads();
        return;
      }

      var triple = {
          subject: vertexes[0]
        , predicate: "p"
        , object: vertexes[1]
      };

      vertexes.pop();
      vertexes.unshift("v" + counts);

      db.put(triple, doWrites);
    }

  , doReads = function() {

      var stream = db.searchStream([{
          subject: db.v("a")
        , predicate: "p"
        , object: db.v("b")
      }, {
          subject: db.v("b")
        , predicate: "p"
        , object: db.v("c")
      }]);

      stream.on("data", function() {
        counts++;
      });

      stream.on("end", function() {
        endTime = new Date();
        var totalTime = endTime - startTime;
        console.log("total time", totalTime);
        console.log("total data", counts);
        console.log("join result/s", counts / totalTime * 1000);
        db.close();
      });
    };

doWrites();
