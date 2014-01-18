
var level = require("level-test")()

  , levelgraph = require("../")

  , db = levelgraph(level())

  , startCounts = 10000

  , counts = startCounts

  , startTime

  , endTime

  , doWrites = function() {
      if(--counts === 0) {
        startTime = new Date();
        counts = startCounts;
        doReads();
      }

      var triple = {
        subject: "s" + counts,
        predicate: "p" + counts,
        object: "o" + counts
      };

      db.put(triple, doWrites);
    }

  , doReads = function() {
      if(--counts === 0) {
        endTime = new Date();
        var totalTime = endTime - startTime;
        console.log("total time", totalTime);
        console.log("reads/s", startCounts / totalTime * 1000);
        process.exit(0);
        return;
      }

      var num = Math.round(Math.random() * startCounts);

      var triple = {
        subject: "s" + num
      };

      db.get(triple, doReads);
    };

doWrites();
