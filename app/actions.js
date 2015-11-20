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
        chunks: []
      }
    };

    for (var i = 0; i < chunks.length; i++) {
      request.data.chunks.push(chunks[i]);
    }

    app.dispatcher.dispatch({
      remote: true,
      request: request
    });
  };
})(window.app.actions = {});
