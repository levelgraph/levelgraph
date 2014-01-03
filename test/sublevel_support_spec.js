
var levelgraph = require('../lib/levelgraph')
  , level = require('level-test')()
  , sublevel = require('level-sublevel')
  , osenv = require('osenv');

describe('sublevel support', function() {

  var db, graph;

  beforeEach(function() {
    db = sublevel(level(''));
    graph = levelgraph(db.sublevel('graph'));
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('should put a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    graph.put(triple, done);
  });

  it('should get a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    graph.put(triple, function() {
      graph.get({ subject: 'a' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });
  });

  it('should not close anything', function(done) {
    graph.close(done);
  });
});
