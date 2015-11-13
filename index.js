var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var constants = require('./app/constants.js');
var noise = require('./app/components/perlin.js').noise;
var serialize = require('./app/components/serialize.js').serialize;
var png = require('pngjs').PNG;
var fs = require('fs');
var mustache = require('mustache');
var mongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var streamToArray = require('stream-to-array');

var templates = {}, partials = {}, worlds = {}, dbConnection, worldCollection, chunksCollection, terrainGradients;

var runArg = (process.argv[2]);

process.on('exit', function () {
  dbConnection.close();
});

switch (runArg) {
  case 'generate':
    dbConnect(function () {
      generateWorld();
    });
    break;
  default:
    dbConnect(function () {
      loadWorlds();
      startServer();
    });
    /**loadWorld();
    startServer();**/
    break;
}

function dbConnect (callback) {
  mongoClient.connect('mongodb://localhost:27017/mmociv', function(err, db) {
    assert.equal(null, err);
    console.log("Connected correctly to server");

    dbConnection = db;

    worldCollection = dbConnection.collection('worlds');
    chunksCollection = dbConnection.collection('chunks');

    callback();
  });
}

function startServer () {
  loadTemplates(function () {
    http.listen(3000, function(){
      console.log('listening on *:3000');
    });

    app.use(express.static('bower_components'));
    app.use(express.static('app'));

    app.get('/', function (req, res) {
      res.send(mustache.render(templates['app/templates/index.mustache'], {}, partials));
    });

    app.get('/world/chunk/', function (req, res) {
      var chunk = chunksCollection.find({x: parseInt(req.query.chunkX), y: parseInt(req.query.chunkY), world: req.query.world});

      chunk.toArray().then(function (objects) {
        if (objects.length) {
          res.json(objects);
        } else {
          generateChunk(parseInt(req.query.chunkX), parseInt(req.query.chunkY), worlds[req.query.world], function (newChunk) {
            res.json(newChunk);
          });
        }
      });
    });

    app.get('/world/chunks/', function (req, res) {
      var chunks = JSON.parse(req.query.chunks),
        missingChunks = [],
        chunksGenerated = 0,
        chunkFound, chunkX, chunkY, chunkWorld;

      chunksCollection.find({_id: {$in: chunks}, world: req.query.world}).toArray().then(function (objects) {
        if (chunks.length !== objects.length) {
          for (var i = 0; i < chunks.length; i++) {
            chunkFound = false;
            for (var i2 = 0; i2 < objects.length; i2++) {
              if (chunks[i] === objects[i2]._id) {
                chunkFound = true;
                break;
              }
            }

            if (!chunkFound) {
              missingChunks.push(chunks[i]);
            }
          }

          for (i = 0; i < missingChunks.length; i++) {
            chunkX = parseInt(missingChunks[i].split('.')[0]);
            chunkY = parseInt(missingChunks[i].split('.')[1]);
            chunkWorld = worlds[missingChunks[i].split('.')[2]];

            generateChunk(chunkX, chunkY, chunkWorld, function () {
              chunksGenerated++;

              if (chunksGenerated === missingChunks.length) {
                chunksCollection.find({_id: {$in: chunks}, world: req.query.world}).toArray().then(function (finalObjects) {
                  res.json(finalObjects);
                });
              }
            });
          }
        }
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
      _id: 'world',
      name: 'world',
      terrainGradientPath: 'terrain-gradient.png',
      seed: config ? config.seed : Math.random()
    };

  worldCollection.save(world, {}, function () {
    console.log('wrote new world to database');

    process.exit();
  });
}

function loadWorlds () {
  var worldObjects = worldCollection.find();

  worldObjects.toArray().then(function (objects) {
    for (var i = 0; i < objects.length; i++) {
      (function (index) {
        loadWorldTerrainGradient('resources/' + objects[index].terrainGradientPath, objects[index], function () {
          worlds[objects[index].name] = objects[index];
          console.log('world loaded: ' + objects[index].name);
        });
      })(i);
    }
  });
}

function generateChunk (chunkX, chunkY, world, callback) {
  var initialWorldX = chunkX,
  initialWorldY = chunkY,
  newPNG, idx, worldX, worldY;

  var newChunk = {
    _id: chunkX + '.' + chunkY + '.' + world._id,
    world: world._id,
    x: chunkX,
    y: chunkY,
  };

  noise.seed(world.seed);

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
        iterations: 2,
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

  newPNG.pack().pipe(serialize.pngToBase64(function (imageString) {
    newChunk.image = imageString;
    chunksCollection.save(newChunk);
    callback(newChunk);
  }));
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
