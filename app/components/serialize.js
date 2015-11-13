(function(global){
  var module = global.serialize = {};

  var stream = require('stream');
  var util = require('util');
  // use Node.js Writable, otherwise load polyfill
  var Writable = stream.Writable ||
    require('readable-stream').Writable;

  var memStore;

  module.pngToBase64 = function (callback) {
    var wstream = new WMStrm();

    wstream.on('finish', function () {
      callback(memStore.toString('base64'));
    });
    return wstream;
  };

  function WMStrm(options) {
    // allow use without new operator
    if (!(this instanceof WMStrm)) {
      return new WMStrm(options);
    }
    Writable.call(this, options); // init super
    memStore = new Buffer(''); // empty
  }
  util.inherits(WMStrm, Writable);

  WMStrm.prototype._write = function (chunk, enc, cb) {
    // our memory store stores things in buffers
    var buffer = (Buffer.isBuffer(chunk)) ?
      chunk :  // already is Buffer use it
      new Buffer(chunk, enc);  // string, convert

    // concat to the buffer already there
    memStore = Buffer.concat([memStore, buffer]);
    cb();
  };
})(this);
