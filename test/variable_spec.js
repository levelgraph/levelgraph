
var Variable = require('../lib/variable');

describe('Variable', function() {

  it('should have a name', function() {
    var v = new Variable('x');
    expect(v).to.have.property('name', 'x');
  });

  it('should have a name (bis)', function() {
    var v = new Variable('y');
    expect(v).to.have.property('name', 'y');
  });

  describe('#isBound', function() {

    var instance;

    beforeEach(function() {
      instance = new Variable('x');
    });

    it('should return true if there is a key in the solution', function() {
      expect(instance.isBound({ x: 'hello' })).to.equal(true);
    });

    it('should return false if there is no key in the solution', function() {
      expect(instance.isBound({})).to.equal(false);
    });

    it('should return false if there is another key in the solution', function() {
      expect(instance.isBound({ hello: 'world' })).to.equal(false);
    });
  });

  describe('#bind', function() {

    var instance;

    beforeEach(function() {
      instance = new Variable('x');
    });

    it('should return a different object', function() {
      var solution = {};
      expect(instance.bind(solution, 'hello')).to.not.be.equal(solution);
    });

    it('should set an element in the solution', function() {
      var solution = {};
      expect(instance.bind(solution, 'hello')).to.be.deep.equal({ x: 'hello' });
    });

    it('should copy values', function() {
      var solution = { y: 'world' };
      expect(instance.bind(solution, 'hello')).to.be.deep.equal({ x: 'hello', y: 'world' });
    });
  });

  describe('#isBindable', function() {

    var instance;

    beforeEach(function() {
      instance = new Variable('x');
    });

    it('should bind to the same value', function() {
      expect(instance.isBindable({ x: 'hello' }, 'hello')).to.equal(true);
    });

    it('should not bind to a different value', function() {
      expect(instance.isBindable({ x: 'hello' }, 'hello2')).to.equal(false);
    });

    it('should bind if the key is not present', function() {
      expect(instance.isBindable({}, 'hello')).to.equal(true);
    });
  });
});
