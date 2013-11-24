
var Transform = require('./streamwrapper').Transform
  , Variable = require('./variable')
  , utilities = require('./utilities')
  , queryMask = utilities.queryMask
  , variablesMask = utilities.variablesMask
  , maskUpdater
  , matcher;

function JoinStream(options) {
  if (!(this instanceof JoinStream)) {
    return new JoinStream(options);
  }

  options.objectMode = true;

  Transform.call(this, options);
  
  this.triple = options.triple;
  this.matcher = matcher(options.triple);
  this.mask = queryMask(options.triple);
  this.maskUpdater = maskUpdater(options.triple);
  this.db = options.db;
  this._index = options.index;

  var that = this;
  this.once('pipe', function(source) {
    source.on('error', function(err) {
      that.emit('error', err);
    });
  });
}

JoinStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: JoinStream } }
);

JoinStream.prototype._transform = function(solution, encoding, done) {

  var that = this;

  var newMask = this.maskUpdater(solution, this.mask);
  var readStream = this.db.getStream(newMask, { index: this._index });

  readStream.on('data', function(triple) {
    var newsolution = that.matcher(solution, triple);

    if (newsolution) {
      that.push(newsolution);
    }
  });

  readStream.on('error', function(err) {
    that.emit('error', err);
  });

  readStream.on('end', done);
};

module.exports = JoinStream;

matcher = function(pattern) {
  var variables = variablesMask(pattern);
  return function(solution, triple) {
    var bindable = Object.keys(variables).every(function(key) {
      var variable = variables[key];
      return variable.isBindable(solution, triple[key]);
    });

    if (!bindable) {
      return false;
    }
  
    return Object.keys(variables).reduce(function(newsolution, key) {
      var variable = variables[key];
      return variable.bind(newsolution, triple[key]);
    }, solution);
  };
};

maskUpdater = function(pattern) {
  var variables = variablesMask(pattern);
  return function(solution, mask) {
    return Object.keys(variables).reduce(function(newMask, key) {
      var variable = variables[key];
      if (variable.isBound(solution)) {
        newMask[key] = solution[variable.name];
      }
      return newMask;
    }, Object.keys(mask).reduce(function(acc, key) {
      acc[key] = mask[key];
      return acc;
    }, {}));
  };
};
