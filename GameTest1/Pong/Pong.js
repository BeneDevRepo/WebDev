Number.prototype.clamp = function(min, max) {
	return Math.min(Math.max(this, min), max);
};


let canvas;
let ctx;

let game = {
	ball: {
		size: 20,
		px: 0,
		py: 0,
		vx: 0,
		vy: 0,
		reset: function() {
			this.px = canvas.width / 2;
			this.py = canvas.height / 2;
			this.vx = -200;
			this.vy = -130;
		},
	},
	paddleL: {
		height: 120,
		width: 15,
		dist: 30,
		y: 0,
	},
	paddleR: {
		height: 120,
		width: 15,
		dist: 30,
		y: 0,
		vy: 300,
	},
	keyUp: false,
	keyDown: false,
};


window.onload = function onload() {
	canvas = document.getElementById("mainCanvas");
	ctx = canvas.getContext("2d");
	
	document.onkeydown = keyDown;
	document.onkeyup = keyUp;

	// const host = "ws://" + window.location.host + ":88/GameTest1/Pong/server.php"; 
	// let socket = new WebSocket(host);
	// socket.onmessage = function(e) {
	// 	let msg = JSON.parse(e.data)
	// 	document.getElementById('time').innerHTML = msg.time;
	// 	socket.send(JSON.stringify(msg));
	// };


	game.ball.reset();

	requestAnimationFrame(loop);
}

function keyDown(event) {
	// console.log("Key Down: ", event.keyCode);
	if(event.keyCode == 37 || event.keyCode == 40)
		game.keyDown = true;
	if(event.keyCode == 39 || event.keyCode == 38)
		game.keyUp = true;
	
	if(event.key == "r")
		game.ball.reset();
}

function keyUp(event) {
	// console.log("Key Up: " + event.keyCode);
	if(event.keyCode == 37 || event.keyCode == 40)
		game.keyDown = false;
	if(event.keyCode == 39 || event.keyCode == 38)
		game.keyUp = false;
}

let prevTime = performance.now();
function loop() {
	const curTime = performance.now();
	const dt = (curTime - prevTime) / 1000.;
	prevTime = curTime;

	// console.log("Fps: ", Math.ceil(1. / dt));
	document.getElementById("fps").innerText = "Fps: " + Math.floor(1. / dt);


	// move ball:
	game.ball.px += game.ball.vx * dt;
	game.ball.py += game.ball.vy * dt;


	// move right pedal:
	if(game.keyDown)
		game.paddleR.y += game.paddleR.vy * dt;
	if(game.keyUp)
		game.paddleR.y -= game.paddleR.vy * dt;
	game.paddleR.y = game.paddleR.y.clamp(0, canvas.height - game.paddleR.height);
	
	// move left pedal:
	game.paddleL.y = game.ball.py - game.paddleL.height / 2;
	game.paddleL.y = game.paddleL.y.clamp(0, canvas.height - game.paddleL.height);
	
	
	// bounce ball off of walls
	if(game.ball.py < 0 || game.ball.py > canvas.height - game.ball.size) {
		game.ball.vy *= -1;
		game.ball.py = game.ball.py.clamp(0, canvas.height - game.ball.size);
	}

	// if(game.ball.px < 0) {
	// 	game.ball.vx *= -1;
	// 	game.ball.px = game.ball.px.clamp(0, canvas.width - game.ball.size);
	// }

	// if(game.ball.px < 0 || game.ball.px > canvas.width - game.ball.size) {
	// 	game.ball.vx *= -1;
	// 	game.ball.px = game.ball.px.clamp(0, canvas.width - game.ball.size);
	// }

	// bounce ball off of left pedal:
	if(game.ball.px < game.paddleL.dist + game.paddleL.width) {
		const prevBefore = true;
		const insideY = game.ball.py + game.ball.size > game.paddleL.y
			&& game.ball.py < game.paddleL.y + game.paddleL.height;
		if(prevBefore && insideY) {
			game.ball.vx *= -1;
			game.ball.px = game.paddleL.dist + game.paddleL.width;
		}
	}

	// bounce ball off of right pedal:
	if(game.ball.px + game.ball.size > canvas.width - game.paddleR.dist - game.paddleR.width) {
		const prevBefore = game.ball.px - game.ball.vx * dt + game.ball.size <= canvas.width - game.paddleR.dist - game.paddleR.width;
		const insideY = game.ball.py + game.ball.size > game.paddleR.y
			&& game.ball.py < game.paddleR.y + game.paddleR.height;
		if(prevBefore && insideY) {
			game.ball.vx *= -1;
			game.ball.px = canvas.width - game.paddleR.dist - game.paddleR.width - game.ball.size;
		}
	}

	// Background:
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// Divider:
	ctx.fillStyle = "white";
	for(let y = 0; y < canvas.height - 20; y += 40)
		ctx.fillRect(canvas.width / 2 - 5, y, 10, 20);
	

	// Ball:
	ctx.fillStyle = 'red';
	ctx.fillRect(game.ball.px, game.ball.py, game.ball.size, game.ball.size);


	ctx.fillStyle = 'blue';
	ctx.fillRect(
		game.paddleL.dist,
		game.paddleL.y,
		game.paddleL.width,
		game.paddleL.height);
	ctx.fillRect(
		canvas.width - game.paddleR.dist - game.paddleR.width,
		game.paddleR.y,
		game.paddleR.width,
		game.paddleR.height);


	requestAnimationFrame(loop);
}