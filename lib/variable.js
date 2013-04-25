
function Variable(name) {
  if (!(this instanceof Variable)) {
    return new Variable(name);
  }

  this.name = name;
}

Variable.prototype.bind = function(context, value) {
  var newContext = {};

  Object.keys(context).reduce(function(acc, key) {
    acc[key] = context[key];
    return acc;
  }, newContext);

  newContext[this.name] = value;

  return newContext;
};

Variable.prototype.isBound = function(context) {
  if(context[this.name]) {
    return true;
  }

  return false;
};

Variable.prototype.isBindable = function(context, value) {
  return !this.isBound(context) || context[this.name] === value;
};

module.exports = Variable;
