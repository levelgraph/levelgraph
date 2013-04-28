
var defs = {
  spo: ["subject", "predicate", "object"],
  sop: ["subject", "object", "predicate"],
  pso: ["predicate", "object", "subject"],
  pos: ["predicate", "subject", "object"],
  ops: ["object", "predicate", "subject"],
  osp: ["object", "subject", "predicate"]
};
module.exports.defs = defs;

function genKey(key, triple) {
  return [key].concat(defs[key].map(function(t) {
    return triple[t];
  })).filter(function(e) {
    return e !== null && e !== undefined;
  }).join("::");
}
module.exports.genKey = genKey;
