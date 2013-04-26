
var levelup = require("levelup");

var tmp = require("tmp");

tmp.dir(function(err, dir) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  var db = levelup(dir);

  var startCounts = 100000;
  var counts = startCounts;

  var startTime = new Date();
  var endTime;

  var doBench = function() {
    if(--counts === 0) {
      endTime = new Date();
      var totalTime = endTime - startTime;
      console.log("total time", totalTime);
      console.log("writes/s", startCounts / totalTime * 1000);
      return;
    }

    db.put("aa" + counts, "bb" + counts, doBench);
  };

  doBench();
});
