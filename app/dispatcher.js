(function (dispatcher) {
  var listeners = [];

  dispatcher.dispatch = function (data) {
    if (!data.remote) {
      for (var i = 0; i < listeners.length; i++) {
        listeners[i](data);
      }
    } else {
      //app.socket.emit('', data);
      $.ajax(data.request).success(function (response) {
        console.log(response);
        dispatcher.dispatch(response);
      });
    }
  };

  dispatcher.register = function (callback) {
    listeners.push(callback);
  };

  //app.socket.on('', app.dispatcher.dispatch);
})(window.app.dispatcher = {});
