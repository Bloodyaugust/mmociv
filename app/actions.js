(function (actions) {
  actions.heartbeat = function () {
    app.dispatcher.dispatch({
      type: 'heartbeat',
      timeStamp: new Date
    });
  };

  actions.getChunks = function (chunks) {
    var request = {
      url: '/world/chunks/',
      method: 'POST',
      data: {
        chunks: chunks
      }
    };

    app.dispatcher.dispatch({
      remote: true,
      request: request
    });
  };

  actions.loadViewport = function (viewport) {
    var chunks = [];

    for (var y = viewport.y; y < viewport.y + viewport.height; y++) {
      for (var x = viewport.x; x < viewport.x + viewport.width; x++) {
        chunks.push(x + '.' + y + '.' + 'world');
      }
    }

    actions.getChunks(chunks);
  };

  actions.moveViewport = function (vector) {
    app.dispatcher.dispatch({
      type: 'viewport:move',
      x: vector.x || 0,
      y: vector.y || 0
    });
  };

  actions.setViewport = function (vector) {
    app.dispatcher.dispatch({
      type: 'viewport:set',
      x: vector.x || 0,
      y: vector.y || 0
    });
  };
})(window.app.actions = {});
