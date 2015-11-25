window.app = {};
(function (app) {
  var templates = [
    'index',
    'viewport_controls',
    'world',
    ],
    partials = [
      'chunk'
    ],
    templatesLoaded = 0,
    totalTemplates = templates.length + partials.length;

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
        templatesLoaded++;

        if (templatesLoaded === totalTemplates) {
          onloadFinish();
        }
      });
    })(i);
  }

  for (i = 0; i < partials.length; i++) {
    (function (iterator) {
      $.get('templates/partials/' + partials[iterator] + '.mustache').success(function (template) {
        app.templates.partials[partials[iterator]] = template;
        templatesLoaded++;

        if (templatesLoaded === totalTemplates) {
          onloadFinish();
        }
      });
    })(i);
  }

  function onloadFinish () {
    for (var view in app.views) {
      if (app.views.hasOwnProperty(view)) {
        if (app.views[view].onload) {
          app.views[view].onload();
        }
      }
    }
  };

  /**window.setInterval(function () {
    app.actions.heartbeat();
  }, 1000);**/
})(window.app);
