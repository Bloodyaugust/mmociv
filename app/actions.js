(function (actions) {
  actions.heartbeat = function () {
    app.dispatcher.dispatch({
      type: 'heartbeat',
      timeStamp: new Date
    });
  };
})(window.app.actions = {});
