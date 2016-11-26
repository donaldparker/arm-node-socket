var app = require('../app');
var debug = require('debug')('arm-node-socket:server');
var http = require('http');
var SerialPort = require('serialport');
var arduino = new SerialPort('/dev/ttyACM0', {
  baudRate: 9600,
  parser: SerialPort.parsers.readline('\n')
}, function(){

});


var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

var server = http.createServer(app);


server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

var ioBrowser = require('socket.io')(server);
ioBrowser.on('connection', function (socket) {
  console.log('a browser connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
  });
});

arduino.on('data', function (data) {
  console.log('Data: ' + data);
  if(ioBrowser){
    ioBrowser.emit('data', data);
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
