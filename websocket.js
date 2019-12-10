var fs = require('fs'), http = require('http'), WebSocket = require('ws');

if (process.argv.length < 3) {
	console.log('输入正确参数');
	process.exit();
}else{
	console.log(process.argv)
}

var stream_secret = process.argv[2];//密码
var stream_port = process.argv[3] || 8081;//ffpeng推送端口
var websocket_port = process.argv[4] || 8082;//前端websocket端口 ，比如：8082
var record_stream = false;

function initWebSocket(websocket_port) {
	var clientMap = new Map();//缓存，实现多个视频流同时播放的问题
	var socketServer = new WebSocket.Server({
		port : websocket_port,
		perMessageDeflate : false
	});
	socketServer.connectionCount = 0;
	socketServer.on('connection', function(socket, upgradeReq) {
		socketServer.connectionCount++;
		var url = upgradeReq.socket.remoteAddress + upgradeReq.url;
		var key = url.substr(1).split('/')[1];//key就是通过url传递过来的标识比如:(ws://127.0.0.1:8082/live3)其中live3就是这个标识，其他的流可随机生成其他的字符串
		clientMap.set(key, socket);
		console.log('webSocket产生新的连接:%s ', url);
		socket.on('close', function(code, message) {
			socketServer.connectionCount--;
			console.log('连接关闭，当前连接数 %d', socketServer.connectionCount);
		});
	});

	socketServer.broadcast = function(data, theme) {
		var client = clientMap.get(theme);
		if (client && client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	};
	return socketServer;
}

function initHttp(stream_port, stream_secret, record_stream, socketServer) {
	var streamServer = http.createServer(
			function(request, response) {
				var params = request.url.substr(1).split('/');
				console.log(params);
				if (params.length != 2) {
					console.log('参数错误,输入密码和推送主题');
					response.end();
				}
				if (params[0] !== stream_secret) {
					console.log('密码错误: %s%s', request.socket.remoteAddress,
							request.socket.remotePort);
					response.end();
				}
				response.connection.setTimeout(0);
				console.log('http连接成功: ' + request.socket.remoteAddress + ':'
						+ request.socket.remotePort);
				request.on('data', function(data) {
					socketServer.broadcast(data, params[1]);
					if (request.socket.recording) {
						request.socket.recording.write(data);
					}
				});
				request.on('end', function() {
					console.log('close');
					if (request.socket.recording) {
						request.socket.recording.close();
					}
				});
				if (record_stream) {
					var path = 'recordings/' + Date.now() + '.ts';
					request.socket.recording = fs.createWriteStream(path);
				}
			}).listen(stream_port);
}

initHttp(stream_port, stream_secret, record_stream,
		initWebSocket(websocket_port));
