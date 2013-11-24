
function Variable(name) {
  if (!(this instanceof Variable)) {
    return new Variable(name);
  }

  this.name = name;
}

Variable.prototype.bind = function(solution, value) {
  var newsolution = {};

  Object.keys(solution).reduce(function(acc, key) {
    acc[key] = solution[key];
    return acc;
  }, newsolution);

  newsolution[this.name] = value;

  return newsolution;
};

Variable.prototype.isBound = function(solution) {
  if(solution[this.name]) {
    return true;
  }

  return false;
};

Variable.prototype.isBindable = function(solution, value) {
  return !this.isBound(solution) || solution[this.name] === value;
};

module.exports = Variable;
