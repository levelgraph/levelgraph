var levelgraph = require('../../lib/levelgraph')
  , { MemoryLevel } = require('memory-level')
  , { ManyLevelHost, ManyLevelGuest } = require('many-level')
  , osenv = require('osenv');

describe('a multileveled triple store', function() {

  var db, graph, leveldb, server, client;

  beforeEach(function() {
    db = new MemoryLevel();
    server = new ManyLevelHost(db);
    client = new ManyLevelGuest();
    graph = levelgraph(client);

    var serverStream = server.createRpcStream();
    serverStream.pipe(client.createRpcStream()).pipe(serverStream);
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

  it('should search a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    graph.put(triple, function() {
      graph.search([{ subject: graph.v('x'), predicate: 'b', object: 'c' }], function(err, list) {
        expect(list).to.eql([{ x: 'a' }]);
        done();
      });
    });
  });

  it('should put a triple with a stream', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    var stream = graph.putStream();
    stream.on('end', done);
    stream.end(triple);
  });

  it('should not close anything', function(done) {
    graph.close(done);
  });
});
