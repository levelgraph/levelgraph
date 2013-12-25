
var levelgraph = require('../lib/levelgraph')
  , level = require('level-test')();

describe('creation api', function() {

  var db;


  afterEach(function(done) {
    if (db) {
      db.close(done);
    }
  });

  it('should create a db passing a levelup instance', function() {
    db = levelgraph(level());
  });

  it('should create a db passing a string', function() {
    db = levelgraph('/tmp/hello');
  });
});
