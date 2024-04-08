var levelgraph = require('../../lib/levelgraph')
  , { MemoryLevel } = require('memory-level')
  , os = require('os')
  , path = require('path');

describe('creation api', function() {

  var db;


  afterEach(function(done) {
    if (db) {
      db.close(done);
    }
  });

  it('should create a db passing a levelup instance', function() {
    db = levelgraph(new MemoryLevel());
  });

  it('should create a db passing a string', function() {
    var dbPath = path.join(os.tmpdir(), 'hello');
    db = levelgraph(dbPath);
  });
});
