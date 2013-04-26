var levelup = require("levelup");
var levelgraph = require("../");

var tmp = require("tmp");

tmp.dir(function(err, dir) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  var db = levelgraph(levelup(dir));

  var startCounts = 100000;
  var counts = startCounts;

  var startTime;
  var endTime;

  var doWrites = function() {
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
  };

  var doReads = function() {

    var stream = db.getStream({});
    stream.on("data", function() {
      counts--;
    });
    stream.on("end", function() {
      endTime = new Date();
      var totalTime = endTime - startTime;
      console.log("total time", totalTime);
      console.log("reads/s", startCounts / totalTime * 1000);
      process.exit(0);
    });
  };

  doWrites();
});
