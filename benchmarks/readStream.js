var level = require("level-test")()

  , levelgraph = require("../")

  , db = levelgraph(level())

  , startCounts = 100000
  , counts = startCounts

  , startTime
  , endTime

  , doWrites = function() {
      if(--counts === 0) {
        startTime = new Date();
        counts = startCounts;
        doReads();
        return;
      }

      var triple = {
        subject: "s" + counts,
        predicate: "p" + counts,
        object: "o" + counts
      };

      db.put(triple, doWrites);
    }

  , doReads = function() {

      var stream = db.getStream({});
      stream.on("data", function() {
        counts--;
      });
      stream.on("end", function() {
        endTime = new Date();
        var totalTime = endTime - startTime;
        console.log("total time", totalTime);
        console.log("reads/s", startCounts / totalTime * 1000);
        db.close();
      });
    };

doWrites();
