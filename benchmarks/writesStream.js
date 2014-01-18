
var level = require("level-test")()
  , levelgraph = require("../")

  , up = level()
  , db = levelgraph(up)

  , startCounts = 100000
  , counts = startCounts

  , startTime = new Date()
  , endTime

  , ws

  , doBench = function() {
      if(--counts === 0) {
        ws.end();
        return;
      }

      var triple = {
        subject: "s" + counts,
        predicate: "p" + counts,
        object: "o" + counts
      };

      ws.write(triple);
      if (counts % 10 === 0) {
        setImmediate(doBench);
      } else {
        doBench();
      }
    };

ws = db.putStream();
ws.on("close", function() {
  endTime = new Date();
  var totalTime = endTime - startTime;
  console.log("total time", totalTime);
  console.log("writes/s", startCounts / totalTime * 1000);
});
doBench();
