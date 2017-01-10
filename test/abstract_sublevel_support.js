
var levelgraph = require('../lib/levelgraph')
  , level = require('memdb')
  , osenv = require('osenv');

module.exports = function(sublevel) {

    describe('sublevel support', function() {

      var db, graph;

      beforeEach(function() {
        db = sublevel(level());
        graph = levelgraph(db.sublevel('graph'));
      });

      afterEach(function(done) {
        setImmediate(function() {
          db.close(done);
        });
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
};
