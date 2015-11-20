(function (world) {
  var $body = $('body'),
    $mainContent = $body.find('.main-content'),
    $world = $body.find('.world'),
    $chunks = $body.find('.chunks');

  var lastView = '', lastDay = 0;

  world.render = function (data) {
    console.log(data);
    $mainContent.html(Mustache.render(app.templates.world, data.gameState, app.templates.partials));
  };

  $(function () {
    //app.actions.getChunks(['1.1.world', '2.2.world', '872346.3246786.world']);
  });

  app.stores.world.register(world.render);
})(window.app.views.world = {});
