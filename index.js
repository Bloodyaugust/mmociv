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
    generateWorld({
      callback: function () {
        loadWorld();
        startServer();
      }
    });
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
  var remainingChunks = (constants['WORLD_SIDE'] * constants['WORLD_SIDE']) / (constants['CHUNK_SIDE'] * constants['CHUNK_SIDE']),
    world = {
      name: 'world',
      chunks: [],
      numChunks: remainingChunks,
      terrainGradientPath: 'terrain-gradient.png',
    };

  config = config || {};

  noise.seed(config.seed ? config.seed : Math.random());

  loadWorldTerrainGradient('world/' + world.terrainGradientPath, world, function () {
    for (var i = 0; remainingChunks > 0; remainingChunks--) {
      generateChunk(i, world);
      console.log('generating chunk: ' + i);
      i++;
    }

    fs.writeFile('world/world.cfg', JSON.stringify(world), function (err) {
      if (err) throw err;
      console.log('World saved');

      config.callback();
    });
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

    loadWorldTerrainGradient('world/' + world.terrainGradientPath, world, function () {});
  });
}

function generateChunk (chunkIndex, world) {
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
      result = noise.sumOctaveSimplex2({
        x: worldX,
        y: worldY,
        iterations: 16,
        persistence: 0.6,
        scale: 0.001
      });
      idx = (constants['CHUNK_SIDE'] * y + x) << 2;
      lerpedColor = {};

      lerpedColor.r = result % 1 + world.terrainGradient[Math.floor(result)].r;
      lerpedColor.g = result % 1 + world.terrainGradient[Math.floor(result)].g;
      lerpedColor.b = result % 1 + world.terrainGradient[Math.floor(result)].b;

      newPNG.data[idx] = lerpedColor.r;
      newPNG.data[idx + 1] = lerpedColor.g;
      newPNG.data[idx + 2] = lerpedColor.b;
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

function loadWorldTerrainGradient (path, world, callback) {
  fs.createReadStream(path).pipe(new png()).on('parsed', function () {
    var gradientImage = this;
    world.terrainGradient = [];

    for (var y = 0; y < gradientImage.height; y++) {
      for (var x = 0; x < gradientImage.width; x++) {
        var idx = (gradientImage.width * y + x) << 2,
          idxColor = {};

        idxColor.r = gradientImage.data[idx];
        idxColor.g = gradientImage.data[idx + 1];
        idxColor.b = gradientImage.data[idx + 2];
        idxColor.a = gradientImage.data[idx + 3];

        world.terrainGradient.push(idxColor);
      }
    }

    callback();
  });
}
