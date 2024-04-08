var levelgraph = require('../../lib/levelgraph')
  , { MemoryLevel } = require('memory-level')
  ;

describe('a basic triple store', function() {

  var db;

  beforeEach(function() {
    db = levelgraph(new MemoryLevel());
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('should put some more data inside a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c', 'someStuff': 42 };
    db.put(triple, done);
  });

  it('should return the inserted data', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c', 'someStuff': 42 };
    db.put(triple, function() {
      db.get({ subject: 'a' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });
  });
});
