Number.prototype.clamp = function(min, max) {
	return Math.min(Math.max(this, min), max);
};


let canvas;
let ctx;


let game = {
	rockets: [],
	particles: [],
};


window.onload = function onload() {
	canvas = document.getElementById("mainCanvas");
	ctx = canvas.getContext("2d");
	
	document.onkeydown = keyDown;
	document.onkeyup = keyUp;

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

let lastLaunch = performance.now();
let prevTime = performance.now();
function loop() {
	const curTime = performance.now();
	const dt = (curTime - prevTime) / 1000.;
	prevTime = curTime;

	ctx.canvas.width  = window.innerWidth;
	ctx.canvas.height = window.innerHeight;

	document.getElementById("fps").innerText = "Fps: " + Math.floor(1. / dt);


	if(performance.now() - lastLaunch > 200) { // one launch every 200 milliseconds
		// lastLaunch += 200;
		lastLaunch = performance.now();

		game.rockets.push({
			x: -100 + Math.random() * (ctx.canvas.width + 200),
			y: ctx.canvas.height,
			vx: Math.random() * 150,
			vy: -650 - Math.random() * 150,
			ttl: 1. + Math.random() * 1,
		});
	}

	for(let rocket of game.rockets) {
		// friction:
		const fFric = {
			x: -rocket.vx * .4,
			y: -rocket.vy * .4,
		};

		const m = .4; // mass
		// F = m * a  <=>  F / m = a

		const aFric = {
			x: fFric.x / m,
			y: fFric.y / m,
		};

		rocket.vx += aFric.x * dt;
		rocket.vy += aFric.y * dt;
		
		// gravity:
		rocket.vy += 60. * dt;

		// apply acceleration:
		rocket.x += rocket.vx * dt;
		rocket.y += rocket.vy * dt;

		rocket.ttl -= dt;
	}

	for(let particle of game.particles) {
		// emit trace vertex:
		const trace = particle.trace;
		if(trace.length >= 2) { // at least 2 particles
			particle.trace[particle.trace.length - 1] = {x: particle.x, y: particle.y};
			const prevTrace = trace[trace.length - 2];
			const dx = prevTrace.x - particle.x;
			const dy = prevTrace.y - particle.y;
			if(Math.sqrt(dx * dx + dy * dy) > 5)
				particle.trace.push({x: particle.x, y: particle.y});
		} else {
			particle.trace.push({x: particle.x, y: particle.y});
		}

		// friction:
		const fFric = {
			x: -particle.vx * .3,
			y: -particle.vy * .3,
		};

		const m = .1; // mass
		// F = m * a  <=>  F / m = a

		const aFric = {
			x: fFric.x / m,
			y: fFric.y / m,
		};

		particle.vx += aFric.x * dt;
		particle.vy += aFric.y * dt;

		// gravity:
		particle.vy += 60. * dt;

		// apply acceleration:
		particle.x += particle.vx * dt;
		particle.y += particle.vy * dt;

		particle.ttl -= dt;
	}

	const explosions = game.rockets.filter(rocket => rocket.ttl <= 0);
	for(const explosion of explosions) {
		const numParticles = Math.floor(100 + Math.random() * 50);

		for(let i = 0; i < numParticles; i++) {
			const a = Math.random() * Math.PI * 2;
			const speed = 120 + Math.random() * 120;

			game.particles.push({
				x: explosion.x,
				y: explosion.y,
				vx: Math.cos(a) * speed,
				vy: Math.sin(a) * speed,
				ttl: 1. + Math.random() * 1,
				trace: [],
			});
		}
	}

	game.rockets = game.rockets.filter(rocket => rocket.ttl > 0); // remove exploded rockets

	game.particles = game.particles.filter(particle => particle.ttl > 0); // remove exploded rockets

	for(particle of game.particles)
		if(particle.trace.length > 5)
			particle.trace.shift();

	// Background:
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	

	ctx.fillStyle = "red";
	for(const rocket of game.rockets) {
		ctx.fillRect(
			rocket.x,
			rocket.y,
			5,
			5);
	}

	
	// ctx.fillStyle = "blue";
	for(const particle of game.particles) {
		if(particle.trace.length >= 2) {
			// ctx.beginPath();
			// ctx.moveTo(particle.trace[0].x, particle.trace[0].y);
			particle.trace.forEach((point, index) => {
				const prev = particle.trace[index - 1];
				if(index != 0) {
					// ctx.strokeStyle = 'rgba(255, 255, 255, .2)';
					// ctx.strokeStyle = 'rgba(0, 0, 255, .2)';
					ctx.strokeStyle = 'hsla(240, 100%, 60%, .2)';
					ctx.lineWidth = (index + 0) * 5. / particle.trace.length;
					ctx.beginPath();
					ctx.moveTo(prev.x, prev.y);
					ctx.lineTo(point.x, point.y);
					ctx.stroke();
				}
			});
			// ctx.stroke();
		}

		ctx.fillStyle = 'hsla(240, 100%, 65%, .3)';
		ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);

		ctx.fillStyle = 'hsla(240, 100%, 80%, .85)';
		ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
	}


	requestAnimationFrame(loop);
}