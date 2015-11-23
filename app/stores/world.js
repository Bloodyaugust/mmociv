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
        position: {
          x: 0,
          y: 0
        },
        width: 12
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

      state.gameState.chunkArray = [];
      for (var chunk in state.gameState.chunks) {
        if (state.gameState.chunks.hasOwnProperty(chunk)) {
          state.gameState.chunkArray.push(state.gameState.chunks[chunk]);
        }
      }

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
