
var Leveljs = require("level-js")
  , levelup = require("levelup")
  , levelgraph = require("levelgraph");

module.exports = function(name, opts) {
  opts = opts || {};
  opts.db = function(l) { return new Leveljs(l); };
  return levelgraph(levelup(name, opts));
};
