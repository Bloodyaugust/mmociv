var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var constants = require('./app/constants.js');

var testMode = (process.argv[2] === 'test');
