(function (world) {
  var state = {
    gameState: {},
    clientState: {}
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
  };

  world.register = function (callback) {
    listeners.push(callback);
  };

  world.emit = function () {
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](state);
    }
  };

  app.dispatcher.register(world.update);
})(window.app.stores.world = {});
