var app = require('../app');
var debug = require('debug')('arm-node-socket:server');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var http = require('http');
var SerialPort = require('serialport');
var arduino = new SerialPort('/dev/ttyACM0', {
  baudRate: 9600,
  dataBits: 8,
  parser: SerialPort.parsers.readline('\n')
}, function(){

});
function intToBinary(val){
  return (val >> 0).toString(2);
}

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

var server = http.createServer(app);
var sockets = {};


var proc;

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

var io = require('socket.io')(server);
io.on('connection', onSocketConnect);

function onSocketConnect(socket){
  sockets[socket.id] = socket;
  socket.on('disconnect', onSocketDisconnect.bind(this, socket));
  socket.on('chatMessage', onChatMessage);
  socket.on('panTilt', onPanTilt);
  socket.on('startStream', onStartStream);
}
function onChatMessage(msg){
  console.log('message: ' + msg);
}
function onSocketDisconnect(socket){
  console.log('user disconnected');
  delete sockets[socket.id];
  if(Object.keys(sockets).length == 0) stopWatching();
}
function onPanTilt(data){
  arduino.write(new Buffer(JSON.stringify(data) + '-END-'), function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
    console.log('message written');
  });
}
function onStartStream(){
  if(app.get('watchingFile')){
    emitLiveStream();
    return;
  }
  var args = ['-vf', '-hf', '-w', '480', '-h', '480', '-o', './stream/image_stream.jpg',  '-t', '999999999', '-tl', '1000'];
  proc = spawn('raspistill', args);
  console.log('Watching for changes...');
  app.set('watchingFile', true);
  fs.watchFile('./stream/image_stream.jpg', emitLiveStream);
}
function emitLiveStream(){
  io.sockets.emit('liveStream', '/stream/image_stream.jpg?t=' + (+new Date()));
}
function stopWatching(){
  app.set('watchingFile', false);
  if(proc) proc.kill();
  fs.unwatchFile('./stream');
}

arduino.on('data', function (data) {
  console.log('Data: ' + data);
  if(io){
    io.emit('data', data);
  }
});

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
