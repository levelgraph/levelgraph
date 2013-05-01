
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

  var doWrites = function() {
    if(--counts === 0) {
      startTime = new Date();
      counts = startCounts;
      doReads();
      return;
    }
    db.put("aa" + counts, "bb" + counts, doWrites);
  };

  var doReads = function() {

    var stream = db.createReadStream();
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
});
