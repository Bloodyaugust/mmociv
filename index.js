var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var constants = require('./app/constants.js');
var noise = require('./app/components/perlin.js').noise;
var png = require('pngjs').PNG;
var fs = require('fs');
var mustache = require('mustache');

var templates = {}, partials = {}, world = {chunks: []};

var runArg = (process.argv[2]);

switch (runArg) {
  case 'generate':
    generateWorld();
    break;
  default:
    loadWorld();
    startServer();
    break;
}

function startServer () {
  loadTemplates(function () {
    http.listen(3000, function(){
      console.log('listening on *:3000');
    });

    app.use(express.static('bower_components'));
    app.use(express.static('app'));

    app.get('/', function (req, res) {
      res.send(mustache.render(templates['app/templates/index.mustache'], world, partials));
    });

    app.get('/world/chunks/:file', function (req, res) {
      res.sendFile('./world/chunks/' + req.params.file, {
        root: __dirname
      });
    });

    app.get('/styles/css/:file', function (req, res) {
      res.sendFile('./styles/css/' + req.params.file, {
        root: __dirname
      });
    });
  });
}

function loadTemplates (callback) {
  var templateFiles = ['app/templates/index.mustache'],
    partialFiles = ['app/templates/partials/world.mustache'],
    filesTotal = templateFiles.length + partialFiles.length,
    filesLoaded = 0;

  templateFiles.forEach(function (file) {
    fs.readFile(file, 'utf8', function (err, data) {
      if (err) throw err;
      templates[file] = data;
      filesLoaded++;

      if (filesLoaded === filesTotal) {
        callback();
      }
    });
  });

  partialFiles.forEach(function (file) {
    fs.readFile(file, 'utf8', function (err, data) {
      if (err) throw err;
      partials[file] = data;
      filesLoaded++;

      if (filesLoaded === filesTotal) {
        callback();
      }
    });
  });
}

function generateWorld (config) {
  var remainingChunks = (constants['WORLD_SIDE'] * constants['WORLD_SIDE']) / (constants['CHUNK_SIDE'] * constants['CHUNK_SIDE']);

  noise.seed(config ? config.seed : Math.random());

  for (var i = 0; remainingChunks > 0; remainingChunks--) {
    generateChunk(i);
    console.log('generating chunk: ' + i);
    i++;
  }

  fs.writeFile('world/world.cfg', JSON.stringify({
    name: 'world1',
    numChunks: world.chunks.length,
  }), function (err) {
    if (err) throw err;
    console.log('World saved');
  });
}

function loadWorld () {
  fs.readFile('world/world.cfg', 'utf8', function (err, data) {
    if (err) throw err;
    world = JSON.parse(data);
    world.chunks = [];

    for (var i = 0; i < world.numChunks; i++) {
      world.chunks.push({
        image: '/world/chunks/world_chunk' + i + '.png'
      });
    }
  });
}

function generateChunk (chunkIndex) {
  var initialWorldX = (chunkIndex % (constants['WORLD_SIDE'] / constants['CHUNK_SIDE'])) * constants['CHUNK_SIDE'],
  initialWorldY = Math.floor(chunkIndex / (constants['WORLD_SIDE'] / constants['CHUNK_SIDE'])) * constants['CHUNK_SIDE'],
  newPNG, idx, worldX, worldY;

  newPNG = new png({
    width: constants['CHUNK_SIDE'],
    height: constants['CHUNK_SIDE']
  });

  worldX = initialWorldX;
  worldY = initialWorldY;
  for (var y = 0; y < constants['CHUNK_SIDE']; y++) {
    for (var x = 0; x < constants['CHUNK_SIDE']; x++) {
      result = (noise.simplex2(worldX / constants['CHUNK_SIDE'], worldY / constants['CHUNK_SIDE']) + 1) / 2;
      resultColor = result * 255;
      idx = (constants['CHUNK_SIDE'] * y + x) << 2;

      newPNG.data[idx] = resultColor;
      newPNG.data[idx + 1] = resultColor;
      newPNG.data[idx + 2] = resultColor;
      newPNG.data[idx + 3] = 255;

      worldX++;
    }
    worldX = initialWorldX;
    worldY++;
  }

  newPNG.pack().pipe(fs.createWriteStream('world/chunks/world_chunk' + chunkIndex + '.png'));
  world.chunks.push({
    image: '/world/chunks/world_chunk' + chunkIndex + '.png'
  });
  console.log('Wrote image file: ' + 'world/chunks/world_chunk' + chunkIndex + '.png');
}
