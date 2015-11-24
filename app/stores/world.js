(function (world) {
  var state = {
    gameState: {
      chunks: {},
      chunkArray: []
    },
    clientState: {
      world: 'world',
      viewport: {
        height: 12,
        width: 12,
        x: 0,
        y: 0
      }
    }
  },
  listeners = [];

  world.update = function (data) {
    if (data.type === 'game') {
      state.gameState = data.game;
      world.emit();
    }

    if (data.type === 'client') {
      world.emit();
    }

    if (data.type === 'chunks') {
      for (var i = 0; i < data.chunks.length; i++) {
        state.gameState.chunks[data.chunks[i]._id] = data.chunks[i];
      }

      state.gameState.chunkArray = data.chunks;

      world.emit();
    }

    if (data.type === 'viewport:move') {
      state.clientState.viewport.x += data.x || 0;
      state.clientState.viewport.y += data.y || 0;

      app.actions.loadViewport(state.clientState.viewport);

      world.emit();
    }
    if (data.type === 'viewport:set') {
      state.clientState.viewport.x = data.x || state.clientState.viewport.x;
      state.clientState.viewport.y = data.y || state.clientState.viewport.y;

      app.actions.loadViewport(state.clientState.viewport);

      world.emit();
    }
  };

  world.register = function (callback) {
    listeners.push(callback);
  };

  world.emit = function () {
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](state);
    }
  };

  world.getState = function () {
    return state;
  };

  app.dispatcher.register(world.update);
})(window.app.stores.world = {});
