(function (world) {
  var $body = $('body'),
    $controls = $body.find('.controls'),
    $mainContent = $body.find('.main-content'),
    $world = $body.find('.world'),
    $chunks = $body.find('.chunks');

  var lastView = '', lastDay = 0;

  world.onload = function () {
    app.actions.loadViewport(window.app.stores.world.getState().clientState.viewport);

    $controls.html(Mustache.render(app.templates['viewport_controls'], {}));
  };

  world.render = function (data) {
    var sortedChunks = data.gameState.chunkArray;

    sortedChunks.sort(sortChunks);
    $mainContent.html(Mustache.render(app.templates.world, data.gameState, app.templates.partials));
  };

  function sortChunks (a, b) {
    if (a.y === b.y) {
      if (a.x === b.x) {
        return 0;
      } else if (a.x < b.x) {
        return -1;
      } else {
        return 1;
      }
    } else if (a.y < b.y) {
      return -1;
    } else {
      return 1;
    }
  }

  app.stores.world.register(world.render);
})(window.app.views.world = {});
