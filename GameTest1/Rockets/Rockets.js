Number.prototype.clamp = function(min, max) {
	return Math.min(Math.max(this, min), max);
};


let canvas;
let ctx;

let Direction = Object.freeze({
	left: "Left",
	right: "Right",
	up: "Up",
	down: "Down",
});


let game = {
	rockets: [],
	particles: [],
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

	requestAnimationFrame(loop);
}

function keyDown(event) {
	// console.log("Key Down: ", event.keyCode);
	if(event.keyCode == 37) // left
		game.dir = Direction.left;
	if(event.keyCode == 39) // right
		game.dir = Direction.right;

	if(event.keyCode == 40) // down
		game.dir = Direction.down;
	if(event.keyCode == 38) // up
		game.dir = Direction.up;
	
	if(event.key == "r")
		game.ball.reset();
}

function keyUp(event) {
	// console.log("Key Up: " + event.keyCode);
	// if(event.keyCode == 37 || event.keyCode == 40)
	// 	game.keyDown = false;
	// if(event.keyCode == 39 || event.keyCode == 38)
	// 	game.keyUp = false;
}


let prevTime = performance.now();
function loop() {
	const curTime = performance.now();
	const dt = (curTime - prevTime) / 1000.;
	prevTime = curTime;

	ctx.canvas.width  = window.innerWidth;
	ctx.canvas.height = window.innerHeight;

	document.getElementById("fps").innerText = "Fps: " + Math.floor(1. / dt);

	logic:
	if(Math.random() * 20 <= 1) {
		game.rockets.push({
			x: Math.random() * ctx.canvas.width,
			y: ctx.canvas.height - 100,
			vx: Math.random() * 5,
			vy: -250 - Math.random() * 50,
			ttl: Math.floor(100 + Math.random() * 20),
		});
	}

	for(let rocket of game.rockets) {
		rocket.x += rocket.vx * dt;
		rocket.y += rocket.vy * dt;
	}


	// Background:
	// ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	

	ctx.fillStyle = "red";
	for(const rocket of game.rockets) {
		ctx.fillRect(
			rocket.x,
			rocket.y,
			5,
			5);
	}


	requestAnimationFrame(loop);
}