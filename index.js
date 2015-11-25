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
var bodyParser = require('body-parser');
var multer = require('multer');

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
    app.use(express.static('node_modules'));
    app.use(express.static('app'));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

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

    app.post('/world/chunks/', function (req, res) {
      var chunks = req.body.chunks,
        missingChunks = [],
        chunksGenerated = 0,
        chunkFound, chunkX, chunkY, chunkWorld;

      chunksCollection.find({_id: {$in: chunks}}).toArray().then(function (objects) {
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

          console.log('grabbing missing chunks: ', missingChunks);
          generateChunks(missingChunks, function () {
            chunksCollection.find({_id: {$in: chunks}}).toArray().then(function (finalObjects) {
              res.json({
                type: 'chunks',
                chunks: finalObjects,
              });
            });
          });
        } else {
          res.json({
            type: 'chunks',
            chunks: objects,
          });
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
  var templateFiles = [
    'app/templates/index.mustache',
    'app/templates/viewport_controls.mustache',
    'app/templates/world.mustache',
    ],
    partialFiles = [
      'app/templates/partials/chunk.mustache'
    ],
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

function generateChunks (chunks, callback) {
  var chunksGenerated = 0,
    completeChunks = [],
    writeIndex = 0,
    initialWorldX, initialWorldY, chunkWorld, chunkX, chunkY, idx, worldX, worldY, newCompleteChunk;

  console.log('generating chunks: ', chunks);
  for (var i = 0; i < chunks.length; i++) {
    newCompleteChunk = {};
    chunkX = parseInt(chunks[i].split('.')[0]);
    chunkY = parseInt(chunks[i].split('.')[1]);
    chunkWorld = worlds[chunks[i].split('.')[2]];
    console.log('chunk coords and world: ', chunkX, chunkY, chunkWorld._id);
    initialWorldX = chunkX * constants['CHUNK_SIDE'];
    initialWorldY = chunkY * constants['CHUNK_SIDE'];
    console.log(initialWorldX, initialWorldY);

    newCompleteChunk.chunk = {
      _id: chunks[i],
      world: chunkWorld._id,
      x: chunkX,
      y: chunkY,
    };

    noise.seed(chunkWorld.seed);
    console.log(chunkWorld.seed);

    newCompleteChunk.image = new png({
      width: constants['CHUNK_SIDE'],
      height: constants['CHUNK_SIDE']
    });

    worldX = initialWorldX;
    worldY = initialWorldY;
    console.log('new chunk coords: ', worldX, worldY);
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

        lerpedColor.r = result % 1 + chunkWorld.terrainGradient[Math.floor(result)].r;
        lerpedColor.g = result % 1 + chunkWorld.terrainGradient[Math.floor(result)].g;
        lerpedColor.b = result % 1 + chunkWorld.terrainGradient[Math.floor(result)].b;

        newCompleteChunk.image.data[idx] = lerpedColor.r;
        newCompleteChunk.image.data[idx + 1] = lerpedColor.g;
        newCompleteChunk.image.data[idx + 2] = lerpedColor.b;
        newCompleteChunk.image.data[idx + 3] = 255;

        worldX++;
      }
      worldX = initialWorldX;
      worldY++;
    }

    completeChunks.push(newCompleteChunk);
  }

  console.log('writing first chunk', completeChunks[0].chunk);
  writeChunk(completeChunks[0].chunk, completeChunks[0].image, writeChunkCallback);

  function writeChunkCallback () {
    writeIndex++;

    console.log('chunk written: ' + (writeIndex - 1));
    if (writeIndex < completeChunks.length) {
      console.log('Starting write for chunk: ', writeIndex);
      writeChunk(completeChunks[writeIndex].chunk, completeChunks[writeIndex].image, writeChunkCallback);
    } else {
      console.log('Chunk writing complete.');
      callback();
    }
  }
}

function writeChunk (chunk, image, callback) {
  console.log('serializing image for chunk: ', chunk);
  image.pack().pipe(serialize.pngToBase64(function (imageString) {
    chunk.image = imageString;
    chunksCollection.save(chunk);
    console.log('chunk generated and saved: ', chunk._id);
    callback();
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
