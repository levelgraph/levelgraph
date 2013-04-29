
var CallbackStream = require("./callbackstream");

function wrapCallback(method) {
  return function(query, cb) {
    var args = Array.prototype.slice.call(arguments, 0);
    var callback = args.pop();
    var stream = null;

    stream = this[method].apply(this, args);

    stream.pipe(CallbackStream({ callback: callback }));
  };
}

module.exports.wrapCallback = wrapCallback;
