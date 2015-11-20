window.app = {};
(function (app) {
  var templates = [
    'index',
    'world',
    ],
    partials = [
      'chunk'
    ];

  app.stores = {};
  app.templates = {
    partials: {}
  };
  app.views = {};
  //app.socket = io('//:3000');

  for (var i = 0; i < templates.length; i++) {
    (function (iterator) {
      $.get('templates/' + templates[iterator] + '.mustache').success(function (template) {
        app.templates[templates[iterator]] = template;
      });
    })(i);
  }

  for (i = 0; i < partials.length; i++) {
    (function (iterator) {
      $.get('templates/partials/' + partials[iterator] + '.mustache').success(function (template) {
        app.templates.partials[partials[iterator]] = template;
      });
    })(i);
  }

  window.setInterval(function () {
    app.actions.heartbeat();
  }, 1000);
})(window.app);
