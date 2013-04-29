
var CallbackStream = require("./callbackstream");

function wrapCallback(method) {
  return function(query, cb) {
    var args = Array.prototype.slice.call(arguments, 0);
    var stream = null;

    if (args.length >= 1) {
      stream = this[method](query);
    } else {
      stream = this[method]();
    }

    stream.pipe(CallbackStream({ callback: args[args.length - 1] }));
  };
}

module.exports.wrapCallback = wrapCallback;
