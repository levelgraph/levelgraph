
function Variable(name) {
  if (!(this instanceof Variable)) {
    return new Variable(name);
  }

  this.name = name;
}

Variable.prototype.bind = function(solution, value) {
  var newsolution = {}
    , key;

  if (!this.isBindable(solution, value)) {
    return null;
  }

  for (key in solution) {
    if (solution.hasOwnProperty(key)) {
      newsolution[key] = solution[key];
    }
  }

  newsolution[this.name] = value;

  return newsolution;
};

Variable.prototype.isBound = function(solution) {
  return solution[this.name] && true || false;
};

Variable.prototype.isBindable = function(solution, value) {
  return !solution[this.name] || solution[this.name] === value;
};

module.exports = Variable;
