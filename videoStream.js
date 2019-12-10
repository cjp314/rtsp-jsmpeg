var Mpeg1Muxer, VideoStream, events, util, ws;

ws = require("ws");

util = require("util");

events = require("events");

Mpeg1Muxer = require("./mpeg1muxer");

const STREAM_MAGIC_BYTES = "jsmp"; // Must be 4 bytes

const clientMap = new Map();
const mpeg1MuxerMap = new Map();

const logger  = require("./log4");

VideoStream = function(options) {
  this.options = options;
  this.name = options.name;
  this.wsPort = options.wsPort;
  this.inputStreamStarted = false;
  this.pipeStreamToSocketServer();
  return this;
};

util.inherits(VideoStream, events.EventEmitter);

VideoStream.prototype.createNewMpeg1Stream = function(url, socket) {
  // rtsp://admin:admin1234@10.232.82.5:554/h264/ch1/sub/av_stream
  const rtspUrl = url.slice(1);
  // const ip =String(url.split("@")[1]).trim();
  if (clientMap.has(url)) {
    clientMap.get(url).push(socket);
  } else {
    clientMap.set(url, [socket]);
  }

  if (mpeg1MuxerMap.has(url)) {
    return;
  }

  const mpeg1Muxer = new Mpeg1Muxer({
    ffmpegOptions: this.options.ffmpegOptions,
    url: rtspUrl
  });

  mpeg1Muxer.on("mpeg1data", data => {
    return broadcast(data, url);
  });
  let gettingInputData = false;
  let gettingOutputData = false;
  let outputData = [];
  mpeg1Muxer.on("ffmpegStderr", data => {
    let size;
    data = data.toString();
    if (data.indexOf("Input #") !== -1) {
      gettingInputData = true;
    }
    if (data.indexOf("Output #") !== -1) {
      gettingInputData = false;
      gettingOutputData = true;
    }
    if (data.indexOf("frame") === 0) {
      gettingOutputData = false;
    }
    if (gettingInputData) {
      size = data.match(/\d+x\d+/);
      if (size != null) {
        size = size[0].split("x");
        if (mpeg1Muxer.width == null) {
          mpeg1Muxer.width = parseInt(size[0], 10);
        }
        if (mpeg1Muxer.height == null) {
          return (mpeg1Muxer.height = parseInt(size[1], 10));
        }
      }
    }
  });
  mpeg1Muxer.on("ffmpegStderr", function(data) {
    return global.process.stderr.write(data);
  });
  mpeg1Muxer.on("exitWithError", () => {
    return this.emit("exitWithError");
  });
  mpeg1MuxerMap.set(url, mpeg1Muxer);

  return mpeg1Muxer;
};
function broadcast(data, k){
  const clients = clientMap.get(k);
    for (let i = clients.length - 1; i >= 0; i--) {
      const client = clients[i];
      if (client.readyState === 1) {
        client.send(data);
      } else {
        clients.splice(i,1);
        logger.info(
          "Client from remoteAddress " +
            client.remoteAddress +
            " not connected.已移除"
        );
      }
    }
    if(clients.length == 0){
      const mpeg1Muxer =  mpeg1MuxerMap.get(k);
      if(mpeg1Muxer){
        mpeg1Muxer.stream.kill();
        mpeg1MuxerMap.delete(k);
      }else{
        logger.warn('存在k无法映射到mpeg1MuxerMap',k)
      }
      
      
    }
}
VideoStream.prototype.pipeStreamToSocketServer = function() {
  this.wsServer = new ws.Server({
    port: this.wsPort
  });
  logger.info("ws服务开启，端口：" + this.wsPort);
  this.wsServer.on("connection", (socket, request) => {
    return this.onSocketConnect(socket, request);
  });
};

VideoStream.prototype.onSocketConnect = function(socket, request) {
  // admin:admin1234@10.232.82.1
  const url = request.url;
  logger.info("ws客户端url", url);
  this.createNewMpeg1Stream(url, socket);
  
  var streamHeader;
  // Send magic bytes and video size to the newly connected socket
  // struct { char magic[4]; unsigned short width, height;}
  streamHeader = new Buffer(8);
  streamHeader.write(STREAM_MAGIC_BYTES);
  // streamHeader.writeUInt16BE(this.width, 4);
  // streamHeader.writeUInt16BE(this.height, 6);
  socket.send(streamHeader, {
    binary: true
  });
  logger.info(
    `${this.name}: New WebSocket Connection (` +
      this.wsServer.clients.size +
      " total)"
  );
  

  socket.remoteAddress = request.connection.remoteAddress;

  return socket.on("close", (code, message) => {
    return logger.info(
      `${this.name}: Disconnected WebSocket (` +
        this.wsServer.clients.size +
        " total)"
    );
  });
};

module.exports = VideoStream;
