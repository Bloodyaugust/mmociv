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

    for (var y = 0; y < viewport.height; y++) {
      for (var x = 0; x < viewport.width; x++) {
        chunks.push((x + viewport.position.x) + '.' + (y + viewport.position.y) + '.' + 'world');
      }
    }

    actions.getChunks(chunks);
  };
})(window.app.actions = {});
