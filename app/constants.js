(function (constants) {
  constants = {
    'CLIENT': {
      'CLIENT_CONNECTED': 0,
      'CLIENT_UNCONNECTED': 1,
    },
    'GAME_STATE': {
      'SETUP': 0,
    },
    'WIN_STATE': {
      'NONE': 0,
    },
  };

  if (typeof window === 'undefined') {
    module.exports = constants;
  } else {
    window.app.constants = constants;
  }
})({});
