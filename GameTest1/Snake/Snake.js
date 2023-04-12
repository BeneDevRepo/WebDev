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
	width: 10,
	height: 10,
	snake: [
		{ x: 4, y: 5, },
		{ x: 5, y: 5, }, // head (last element)
	],
	food: [],
	dir: Direction.right,

	addFood: function() {
		let newFood;

		let done = false;

		while(!done) {
			newFood = {
				x: Math.floor(Math.random() * this.width),
				y: Math.floor(Math.random() * this.height),
			};

			let overlap = false;
			for(const seg of this.snake) {
				if(seg.x == newFood.x && seg.y == newFood.y) {
					overlap = true;
					break;
				}
			}

			if(!overlap)
				done = true;
		}

		this.food.push(newFood);
	}
};


window.onload = function onload() {
	canvas = document.getElementById("mainCanvas");
	ctx = canvas.getContext("2d");
	
	document.onkeydown = keyDown;
	document.onkeyup = keyUp;

	game.addFood();

	// const host = "ws://" + window.location.host + ":88/GameTest1/Pong/server.php"; 
	// let socket = new WebSocket(host);
	// socket.onmessage = function(e) {
	// 	let msg = JSON.parse(e.data)
	// 	document.getElementById('time').innerHTML = msg.time;
	// 	socket.send(JSON.stringify(msg));
	// };

	requestAnimationFrame(loop);
	setInterval(moveSnake, 300);
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

function moveSnake() {
	let lastSeg = game.snake[game.snake.length - 1];
	let newHead = { x: lastSeg.x, y: lastSeg.y };

	switch(game.dir) {
		case Direction.left:
			newHead.x--;
			break;
		case Direction.right:
			newHead.x++;
			break;
		case Direction.up:
			newHead.y--;
			break;
		case Direction.down:
			newHead.y++;
			break;
	}

	let foodInd = -1;

	game.food.forEach((food, index) => {
		if(food.x == newHead.x && food.y == newHead.y)
			foodInd = index;
	});


	game.snake.push(newHead);

	if(foodInd == -1) {
		game.snake.shift();
	} else {
		game.food.splice(foodInd, 1); // remove food
		game.addFood(); // add new food
	}
}

let prevTime = performance.now();
function loop() {
	const curTime = performance.now();
	const dt = (curTime - prevTime) / 1000.;
	prevTime = curTime;

	// console.log("Fps: ", Math.ceil(1. / dt));
	document.getElementById("fps").innerText = "Fps: " + Math.floor(1. / dt);


	// Background:
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, canvas.width, canvas.height);


	// Checkers:
	// for(let y = 0; y < game.height; y++) {
	// 	for(let x = 0; x < game.width; x++) {
	// 		ctx.fillStyle = (x + y) % 2 == 0 ? "white" : "black";
	// 		ctx.fillRect(
	// 			x * canvas.width / game.width,
	// 			y * canvas.height / game.height,
	// 			canvas.width / game.width,
	// 			canvas.height / game.height);
	// 	}
	// }
		
		
	ctx.fillStyle = "green";
	for(const food of game.food)
		ctx.fillRect(
			food.x * canvas.width / game.width,
			food.y * canvas.height / game.height,
			canvas.width / game.width,
			canvas.height / game.height);


	ctx.fillStyle = "blue";
	for(const segment of game.snake)
		ctx.fillRect(
			segment.x * canvas.width / game.width,
			segment.y * canvas.height / game.height,
			canvas.width / game.width,
			canvas.height / game.height);


	const lastSeg = game.snake[game.snake.length - 1];
	ctx.fillStyle = "red";
	ctx.fillRect(
		lastSeg.x * canvas.width / game.width,
		lastSeg.y * canvas.height / game.height,
		canvas.width / game.width,
		canvas.height / game.height);


	requestAnimationFrame(loop);
}