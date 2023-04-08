window.addEventListener('load', function() {
	
	// var host = 'ws://127.0.0.1:12345/websockets.php';
	// var host = 'ws://127.0.0.1:88/websockets.php';
	// var host = "ws://" + window.location.host + ":12345/websockets.php";
	var host = "ws://" + window.location.host + ":88/GameTest1/websockets.php"; 
	// var host = "ws://" + window.location.host + ":88/websockets.php"; 
	// var host = "ws://" + window.location.host + ":80/websockets.php";

	var socket = new WebSocket(host);
	socket.onmessage = function(e) {
		var msg = JSON.parse(e.data)
		document.getElementById('root').innerHTML = msg.time;
		socket.send(JSON.stringify(msg));
	};

	return;

	var canvas = document.getElementById("mainCanvas");
	var ctx = canvas.getContext("2d");

	px=0, py=0;
	vx=5, vy=3;

	var myTimer = setInterval(loop, 16);

})

function loop() {
	px += vx;
	py += vy;
	
	if(px < 0 || px > canvas.width) {
		vx *= -1;
	}
	
	if(py < 0 || py > canvas.height) {
		vy *= -1;
	}
	
	
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	ctx.beginPath();
	ctx.arc(px, py, 30, 0, 2 * Math.PI, false);
	ctx.fillStyle = 'red';
	ctx.fill();
}