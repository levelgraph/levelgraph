
var level = require("level-test")()
  , levelgraph = require("../")

  , db = levelgraph(level())

  , startCounts = 100000
  , counts = startCounts

  , startTime = new Date()
  , endTime

  , doBench = function() {
      if(--counts === 0) {
        endTime = new Date();
        var totalTime = endTime - startTime;
        console.log("total time", totalTime);
        console.log("writes/s", startCounts / totalTime * 1000);
        return;
      }

      var triple = { 
        subject: "s" + counts,
        predicate: "p" + counts,
        object: "o" + counts
      };

      db.put(triple, doBench);
    };

doBench();
