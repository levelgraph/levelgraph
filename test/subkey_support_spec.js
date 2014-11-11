
var abstractSublevelTest = require('./abstract_sublevel_support');

describe('level-subkey supports test', function() {
  var subkey = require('level-subkey');
  function sublevel(db, opts) {
      var result = subkey(db, opts);
      result.sublevel = result.subkey.bind(result);
      return result;
  }
  abstractSublevelTest(sublevel);
});

