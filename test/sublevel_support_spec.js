
var levelgraph = require('../lib/levelgraph')
  , level = require('level-test')()
  , levelWriteStream = require('level-writestream')
  , sublevel = require('level-sublevel')
  , osenv = require('osenv');

if (typeof levelWriteStream !== 'function') {
  levelWriteStream = function(db) { return db; };
}

describe('sublevel support', function() {

  var db, graph;

  beforeEach(function(done) {
    db = sublevel(levelWriteStream(level('test', { mem: true}, done)));
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

  it('should put a triple with a stream', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    var stream = graph.putStream();
    stream.end(triple);
    stream.on('end', done);
  });

  it('should not close anything', function(done) {
    graph.close(done);
  });
});
