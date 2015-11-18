(function (world) {
  var $body = $('body'),
    $world = $body.find('.world'),
    $chunks = $body.find('.chunks');

  var lastView = '', lastDay = 0;

  world.render = function (data) {

  };

  app.stores.world.register(world.render);
})(window.app.views.world = {});
