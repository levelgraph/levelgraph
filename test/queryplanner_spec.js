
var queryplanner = require('../lib/queryplanner')
  , v = require('../lib/variable')
  , SortJoinStream = require('../lib/sortjoinstream')
  , JoinStream = require('../lib/joinstream');

var upperBoundChar = '\udbff\udfff';

describe('query planner', function() {

  var db, query, planner, stub, expected;

  function buildBefore(algorithm) {

    beforeEach(function() {
      db = {
        db: {
          approximateSize: function() {}
        }
      };
      stub = sinon.stub(db.db, 'approximateSize');
      planner = queryplanner(db, { joinAlgorithm: algorithm });
    });
  }

  describe('with basic algorithm', function() {

    buildBefore('basic');

    it('should return a single condition as-is', function(done) {
      query = [ { predicate: 'friend' } ];
      expected = [ { predicate: 'friend', stream: JoinStream } ];

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 10);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should order two conditions based on their size', function(done) {
      query = [{
          subject: 'matteo'
        , predicate: 'friend'
      }, {
          predicate: 'friend'
      }];

      expected = [{
          subject: 'matteo'
        , predicate: 'friend'
        , stream: JoinStream
      }, {
          predicate: 'friend'
        , stream: JoinStream
      }];

      stub
        .withArgs('pso::friend::matteo::', 'pso::friend::matteo::'+upperBoundChar)
        .yields(null, 1);

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar)
        .yields(null, 10);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should order two conditions based on their size (bis)', function(done) {
      query = [{
          predicate: 'friend'
      }, {
          subject: 'matteo'
        , predicate: 'friend'
      }];

      expected = [{
          subject: 'matteo'
        , predicate: 'friend'
        , stream: JoinStream
      }, {
          predicate: 'friend'
        , stream: JoinStream
      }];

      db.db.approximateSize
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar)
        .yields(null, 10);

      db.db.approximateSize
        .withArgs('pso::friend::matteo::', 'pso::friend::matteo::'+upperBoundChar)
        .yields(null, 1);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should avoid variables', function(done) {
      query = [ { predicate: 'friend', subject: v('x') } ];
      expected = [ { predicate: 'friend', subject: v('x'), stream: JoinStream } ];

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 10);

      planner(query, function(err, result) {
        expect(result).to.eql(query);
        done();
      });
    });
  });

  describe('with sort algorithm', function() {

    buildBefore('sort');

    it('should return a single condition with the JoinStream', function(done) {
      query = [ { predicate: 'friend' } ];
      expected = [ { predicate: 'friend', stream: JoinStream } ];

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 10);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should put the second condition in the same order as the first', function(done) {
      query = [{
          subject: v('x')
        , predicate: 'friend'
        , object: v('c')
      }, {
          subject: v('x')
        , predicate: 'abc'
        , object: v('c')
      }];

      expected = [{
          subject: v('x')
        , predicate: 'friend'
        , object: v('c')
        , stream: JoinStream
        , index: 'pos'
      }, {
          subject: v('x')
        , predicate: 'abc'
        , object: v('c')
        , stream: SortJoinStream
        , index: 'pos'
      }];

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 1);

      stub
        .withArgs('pos::abc::', 'pos::abc::'+upperBoundChar, sinon.match.func)
        .yields(null, 10);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should create the proper index for the friend-of-a-friend query', function(done) {
      query = [{
          subject: v('x')
        , predicate: 'friend'
        , object: v('c')
      }, {
          subject: v('c')
        , predicate: 'friend'
        , object: v('x')
      }];

      expected = [{
          subject: v('x')
        , predicate: 'friend'
        , object: v('c')
        , stream: JoinStream
        , index: 'pos'
      }, {
          subject: v('c')
        , predicate: 'friend'
        , object: v('x')
        , stream: SortJoinStream
        , index: 'pso'
      }];

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 10);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should use a SortJoinStream for a three-conditions query', function(done) {
      query = [{
          subject: v('x')
        , predicate: 'friend'
        , object: v('c')
      }, {
          subject: v('c')
        , predicate: 'friend'
        , object: v('x')
      }, {
          subject: 'bob'
        , predicate: 'father'
        , object: v('c')
      }];

      expected = [{
          subject: v('x')
        , predicate: 'friend'
        , object: v('c')
        , stream: JoinStream
        , index: 'pos'
      }, {
          subject: v('c')
        , predicate: 'friend'
        , object: v('x')
        , stream: SortJoinStream
        , index: 'pso'
      }, {
          subject: 'bob'
        , predicate: 'father'
        , object: v('c')
        , stream: SortJoinStream
        , index: 'pso'
      }];

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 10);

      stub
        .withArgs('pso::father::bob::', 'pso::father::bob::'+upperBoundChar, sinon.match.func)
        .yields(null, 100);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should support inverting the index even on three-conditions queries', function(done) {
      query = [{
          subject: v('x')
        , predicate: 'friend'
        , object: v('c')
      }, {
          subject: v('c')
        , predicate: 'friend'
        , object: v('y')
      }, {
          subject: v('y')
        , predicate: 'friend'
        , object: v('z')
      }];

      expected = [{
          subject: v('x')
        , predicate: 'friend'
        , object: v('c')
        , stream: JoinStream
        , index: 'pos'
      }, {
          subject: v('c')
        , predicate: 'friend'
        , object: v('y')
        , stream: SortJoinStream
        , index: 'pso'
      }, {
          subject: v('y')
        , predicate: 'friend'
        , object: v('z')
        , stream: SortJoinStream
        , index: 'pso'
      }];

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 10);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should put the variables from the previous condition in the same order', function(done) {
      query = [{
          subject: v('x0')
        , predicate: 'friend'
        , object: 'davide'
      }, {
          subject: v('x1')
        , predicate: 'friend'
        , object: v('x0')
      }, {
          subject: v('x1')
        , predicate: 'friend'
        , object: v('x2')
      }];

      expected = [{
          subject: v('x0')
        , predicate: 'friend'
        , object: 'davide'
        , stream: JoinStream
        , index: 'pos'
      }, {
          subject: v('x1')
        , predicate: 'friend'
        , object: v('x0')
        , stream: SortJoinStream
        , index: 'pos'
      }, {
          subject: v('x1')
        , predicate: 'friend'
        , object: v('x2')
        , stream: SortJoinStream
        , index: 'pso'
      }];

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 10);

      stub
        .withArgs('ops::davide::friend::', 'ops::davide::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 1);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should use a SortJoinStream for another three-conditions query', function(done) {
      query = [{
          subject: 'matteo'
        , predicate: 'friend'
        , object: v('x')
      }, {
          subject: v('x')
        , predicate: 'friend'
        , object: v('y')
      }, {
          subject: v('y')
        , predicate: 'friend'
        , object: 'daniele'
      }];

      expected = [{
          subject: 'matteo'
        , predicate: 'friend'
        , object: v('x')
        , stream: JoinStream
        , index: 'pso'
      }, {
          subject: v('x')
        , predicate: 'friend'
        , object: v('y')
        , stream: SortJoinStream
        , index: 'pso'
      }, {
          subject: v('y')
        , predicate: 'friend'
        , object: 'daniele'
        , stream: SortJoinStream
        , index: 'pos'
      }];

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 10);

      stub
        .withArgs('pso::friend::matteo::', 'pso::friend::matteo::'+upperBoundChar, sinon.match.func)
        .yields(null, 1);

      stub
        .withArgs('ops::daniele::friend::', 'ops::daniele::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 100);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should use a SortJoinStream for the friend-of-a-friend-of-a-friend scenario', function(done) {
      query = [{
          subject: 'matteo'
        , predicate: 'friend'
        , object: v('x')
      }, {
          subject: v('x')
        , predicate: 'friend'
        , object: v('y')
      }, {
          subject: v('y')
        , predicate: 'friend'
        , object: v('z')
      }];

      expected = [{
          subject: 'matteo'
        , predicate: 'friend'
        , object: v('x')
        , stream: JoinStream
        , index: 'pso'
      }, {
          subject: v('x')
        , predicate: 'friend'
        , object: v('y')
        , stream: SortJoinStream
        , index: 'pso'
      }, {
          subject: v('y')
        , predicate: 'friend'
        , object: v('z')
        , stream: SortJoinStream
        , index: 'pso'
      }];

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 10);

      stub
        .withArgs('pso::friend::matteo::', 'pso::friend::matteo::'+upperBoundChar, sinon.match.func)
        .yields(null, 1);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should pick the correct indexes with multiple predicates going out the same subject', function(done) {
      query = [{
          subject: v('a')
        , predicate: 'friend'
        , object: 'marco'
      }, {
          subject: v('a')
        , predicate: 'friend'
        , object: v('x1')
      }, {
          subject: v('x1')
        , predicate: 'friend'
        , object: v('a')
      }];

      expected = [{
          subject: v('a')
        , predicate: 'friend'
        , object: 'marco'
        , stream: JoinStream
        , index: 'pos'
      }, {
          subject: v('a')
        , predicate: 'friend'
        , object: v('x1')
        , stream: SortJoinStream
        , index: 'pso'
      }, {
          subject: v('x1')
        , predicate: 'friend'
        , object: v('a')
        , stream: SortJoinStream
        , index: 'pos'
      }];

      stub
        .withArgs('pos::friend::', 'pos::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 10);

      stub
        .withArgs('ops::marco::friend::', 'ops::marco::friend::'+upperBoundChar, sinon.match.func)
        .yields(null, 1);

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });
  });

  describe('without approximateSize', function() {
    beforeEach(function() {
      db = {
        db: {
        }
      };
      planner = queryplanner(db, { joinAlgorithm: 'sort' });
    });


    it('should order two conditions based on their size', function(done) {
      query = [{
          subject: 'matteo'
        , predicate: 'friend'
        , object: v('a')
      }, {
          subject: v('b')
        , predicate: 'friend'
        , object: v('c')
      }];

      expected = [{
          subject: 'matteo'
        , predicate: 'friend'
        , object: v('a')
        , stream: JoinStream
      }, {
          subject: v('b')
        , predicate: 'friend'
        , object: v('c')
        , stream: JoinStream
      }];

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should order two conditions based on their size (bis)', function(done) {
      query = [{
          subject: v('b')
        , predicate: 'friend'
        , object: v('c')
      }, {
          subject: 'matteo'
        , predicate: 'friend'
        , object: v('a')
      }];

      expected = [{
          subject: 'matteo'
        , predicate: 'friend'
        , object: v('a')
        , stream: JoinStream
      }, {
          subject: v('b')
        , predicate: 'friend'
        , object: v('c')
        , stream: JoinStream
      }];

      planner(query, function(err, result) {
        expect(result).to.eql(expected);
        done();
      });
    });

  });
});
