window.app = {};
(function (app) {
  app.stores = {};
  app.views = {};
  app.socket = io('//:3000');

  window.setInterval(function () {
    app.actions.heartbeat();
  }, 1000);
})(window.app);
