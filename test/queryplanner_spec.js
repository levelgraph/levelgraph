
var queryplanner = require("../lib/queryplanner")
  , v = require("../lib/variable");

describe("query planner", function() {

  var db, query, planner, stub;

  beforeEach(function() {
    db = {
      approximateSize: function() {}
    };
    stub = sinon.stub(db, "approximateSize");
    planner = queryplanner(db);
  });

  it("should return a single condition as-is", function(done) {
    query = [ { predicate: "friend" } ];

    stub
      .withArgs("pso::friend::", "pso::friend\xff", sinon.match.func)
      .yields(null, 10);

    planner(query, function(err, result) {
      expect(result).to.eql(query);
      done();
    });
  });

  it("should order two conditions based on their size", function(done) {
    query = [{
        subject: "matteo"
      , predicate: "friend"
    }, {
        predicate: "friend"
    }];

    stub
      .withArgs("pso::friend::", "pso::friend\xff")
      .yields(null, 10);

    stub
      .withArgs("spo::matteo::friend::", "spo::matteo::friend\xff")
      .yields(null, 1);

    planner(query, function(err, result) {
      expect(result).to.eql(query);
      done();
    });
  });

  it("should order two conditions based on their size", function(done) {
    query = [{
        predicate: "friend"
    }, {
        subject: "matteo"
      , predicate: "friend"
    }];

    var expected = [{
        subject: "matteo"
      , predicate: "friend"
    }, {
        predicate: "friend"
    }];

    db.approximateSize
      .withArgs("pso::friend::", "pso::friend\xff")
      .yields(null, 10);

    db.approximateSize
      .withArgs("spo::matteo::friend::", "spo::matteo::friend\xff")
      .yields(null, 1);

    planner(query, function(err, result) {
      expect(result).to.eql(expected);
      done();
    });
  });

  it("should avoid variables", function(done) {
    query = [ { predicate: "friend", subject: v("x") } ];

    stub
      .withArgs("pso::friend::", "pso::friend\xff", sinon.match.func)
      .yields(null, 10);

    planner(query, function(err, result) {
      expect(result).to.eql(query);
      done();
    });
  });
});
