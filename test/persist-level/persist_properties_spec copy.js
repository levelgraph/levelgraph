var levelgraph = require('../../lib/levelgraph')

// according to https://github.com/Level/level/blob/master/UPGRADING.md
const { Level } = require('level')

describe('a basic triple store', function() {

  var db;

  beforeEach(function() {
    var bare  = new Level('./db_test', { valueEncoding: 'json' })
    db        = levelgraph(bare);
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('persist, should put some more data inside a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c', 'someStuff': 42 };
    db.put(triple, done);
  });

  it('persist, should return the inserted data', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c', 'someStuff': 42 };
    // db.put(triple, function() {
      db.get({ subject: 'a' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    // });
  });
});
