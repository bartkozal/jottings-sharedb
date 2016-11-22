const http = require('http')
const Duplex = require('stream').Duplex
const inherits = require('util').inherits
const ShareDB = require('sharedb')
const db = require('sharedb-mongo')
const pubsub = require('sharedb-redis-pubsub')
const WebSocketServer = require('ws').Server
const otText = require('ot-text')

ShareDB.types.map['json0'].registerSubtype(otText.type)

const shareDB = ShareDB({
  db: db(process.env.MONGO_URL),
  pubsub: pubsub({
    url: process.env.REDIS_URL
  })
})

const server = http.createServer()
server.listen(process.env.NODE_PORT, function (err) {
  if (err) { throw err }
  console.log("Listening on port " + server.address().port);
})

const webSocketServer = new WebSocketServer({server: server})

webSocketServer.on('connection', function (socket) {
  var stream = new WebsocketJSONOnWriteStream(socket)
  shareDB.listen(stream)
})

function WebsocketJSONOnWriteStream(socket) {
  Duplex.call(this, {objectMode: true})

  this.socket = socket
  const stream = this

  socket.on('message', function(data) {
    stream.push(data)
  })

  socket.on("close", function() {
    stream.push(null)
  })

  this.on("error", function(msg) {
    console.warn('WebsocketJSONOnWriteStream error', msg)
    socket.close()
  })

  this.on("end", function() {
    socket.close()
  })
}
inherits(WebsocketJSONOnWriteStream, Duplex)

WebsocketJSONOnWriteStream.prototype._write = function(value, encoding, next) {
  this.socket.send(JSON.stringify(value))
  next()
}

WebsocketJSONOnWriteStream.prototype._read = function() {}
