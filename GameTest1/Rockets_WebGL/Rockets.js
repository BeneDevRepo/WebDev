import * as webgl from './WebGL.js';

const vert = x => x;
const frag = x => x;


Number.prototype.clamp = function(min, max) {
	return Math.min(Math.max(this, min), max);
};


let canvas;
let gl;
let shaderProgram;
let shaderPositionAttributeLocation;
let shaderColorAttributeLocation
let shaderPositionBuffer;
let pointSizeUniformLocation;


// const MAX_ROCKETS = 4096;
const MAX_ROCKETS = 1024 * 1024;
let rocket_buffer = new Float32Array(MAX_ROCKETS * 6);


let game = {
	rockets: [],
	particles: [],
};


window.onload = function onload() {
	canvas = document.getElementById("mainCanvas");
	gl = webgl.getContext(canvas);

	const vertexSource = vert`\
		#version 300 es
		precision highp float;

		uniform float pointSize;

		in vec4 a_position;
		in vec3 a_color;

		out vec3 color;

		void main() {
			// gl_PointSize = 20.0;
			color = a_color;
			// gl_PointSize = pointSize;
			gl_PointSize = a_position.z;
			gl_Position = vec4(a_position.xy, 0., 1.);
		}
		`;

	const fragmentSource = frag`\
		#version 300 es
		precision highp float;

		in vec3 color; // h, s, l

		out vec4 fragColor;

		vec3 hsl2rgb(in vec3 c) {
			vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
			return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
		}

		float sq(in float a) {
			return a * a;
		}

		float sigmoid(in float t) {
			return 1. / (1. + exp(-t));
		}
		
		void main() {
			float dist = length(gl_PointCoord.xy * 2. - vec2(1.));

			if(dist > 1.) discard;

			// dist for light strength canculation
			// float lightStrength = 1.;
			// float lightStrength = 1. - dist;
			float lightStrength = cos(dist * (3.1415926 / 2.));

			// lightStrength = sigmoid(-3. + lightStrength * 6.);

			
			lightStrength = pow(lightStrength, 4.);
			// lightStrength *= 1.3;
			// lightStrength = pow(lightStrength, 2.);
			// lightStrength /= 1.7;

			// lightStrength = smoothstep(.3, 1., lightStrength);
			// lightStrength = sq(lightStrength);
			// lightStrength = .4 + .6 * lightStrength;
			// lightStrength = smoothstep(.1, 1., lightStrength);
			// lightStrength = distL;


			// float alpha = 1.;
			float alpha = lightStrength;
			// float alpha = smoothstep(1., .1, dist) * .5;
			// float alpha = smoothstep(1., .8, dist);


			vec3 col = hsl2rgb(vec3(color.r, 1., lightStrength));
			// vec3 col = vec3(lightStrength);


			fragColor = vec4(col, alpha);

			// fragColor = vec4(gl_PointCoord.x, gl_PointCoord.y, 0., .2) * smoothstep(1., .9, dist);
		}
		`;

	shaderProgram = webgl.createShaderProgram(gl, vertexSource, fragmentSource);

	shaderPositionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
	shaderColorAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_color');
	shaderPositionBuffer = gl.createBuffer();

	pointSizeUniformLocation = gl.getUniformLocation(shaderProgram, "pointSize");



	// tell the shader to load our data from the buffer we just made:
	gl.enableVertexAttribArray(shaderPositionAttributeLocation);
	gl.enableVertexAttribArray(shaderColorAttributeLocation);

	gl.bindBuffer(gl.ARRAY_BUFFER, shaderPositionBuffer);
	gl.vertexAttribPointer(shaderPositionAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 0); // 3-dim floats, don't normalize, stride between points, initial offset
	gl.vertexAttribPointer(shaderColorAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 3 * 4); // 3-dim floats, don't normalize, stride between points, initial offset
	
	gl.enable(gl.BLEND);
	// gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

	
	document.onkeydown = keyDown;
	document.onkeyup = keyUp;

	requestAnimationFrame(loop);
}

function keyDown(event) {
	// console.log("Key Down: ", event.keyCode);
	// if(event.keyCode == 37) // left
	// 	game.dir = Direction.left;
	// if(event.keyCode == 39) // right
	// 	game.dir = Direction.right;

	// if(event.keyCode == 40) // down
	// 	game.dir = Direction.down;
	// if(event.keyCode == 38) // up
	// 	game.dir = Direction.up;
	
	// if(event.key == "r")
	// 	game.ball.reset();
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

	gl.canvas.width  = window.innerWidth;
	gl.canvas.height = window.innerHeight;

	document.getElementById("fps").innerText = "Fps: " + Math.floor(1. / dt);


	if(performance.now() - lastLaunch > 200) { // one launch every 200 milliseconds
		// lastLaunch += 200;
		lastLaunch = performance.now();

		game.rockets.push({
			x: -100 + Math.random() * (gl.canvas.width + 200),
			y: 0,
			size: 20 + Math.random() * 5,
			vx: Math.random() * 150,
			vy: 650 + Math.random() * 150,
			ttl: 1. + Math.random() * 1,
			hue: Math.random(),
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
		rocket.vy += -60. * dt;

		// apply acceleration:
		rocket.x += rocket.vx * dt;
		rocket.y += rocket.vy * dt;

		rocket.ttl -= dt;
	}

	for(let particle of game.particles) {
		if(Math.random() / dt < 5)
			particle.trace.push({x: particle.x, y: particle.y});

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
		particle.vy += -60. * dt;

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
				size: explosion.size - 4,
				vx: Math.cos(a) * speed,
				vy: Math.sin(a) * speed,
				ttl: 1. + Math.random() * 1,
				hue: explosion.hue + Math.random() * .2 - .1,
				trace: [],
			});
		}
	}

	

	game.rockets = game.rockets.filter(rocket => rocket.ttl > 0); // remove exploded rockets
	
	game.particles = game.particles.filter(particle => particle.ttl > 0); // remove exploded rockets
	
	// remove old tracers:
	for(let particle of game.particles) {
		particle.trace = particle.trace.filter(
			tracer => {
				const dx = tracer.x - particle.x;
				const dy = tracer.y - particle.y;
				return Math.sqrt(dx * dx + dy * dy) < 30;
			}
		);
	}
	
	// set the view port size
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	
	// clear screen
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	// use program
	gl.useProgram(shaderProgram);

	// bind buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, shaderPositionBuffer);
	
	// set uniforms
	gl.uniform1f(pointSizeUniformLocation, 20);
	
	
	const NUM_ROCKETS = game.rockets.length;
	for(let i = 0; i < NUM_ROCKETS; i++) {
		const rocket = game.rockets[i];

		rocket_buffer[i * 6 + 0] = -1. + rocket.x / gl.canvas.width * 2;
		rocket_buffer[i * 6 + 1] = -1. + rocket.y / gl.canvas.height * 2;
		rocket_buffer[i * 6 + 2] = rocket.size;
		rocket_buffer[i * 6 + 3] = rocket.hue;
	}
	gl.bufferData(gl.ARRAY_BUFFER, rocket_buffer, gl.DYNAMIC_DRAW, 0, NUM_ROCKETS * 6);
	gl.drawArrays(gl.POINTS, 0, NUM_ROCKETS);

	// set uniforms
	gl.uniform1f(pointSizeUniformLocation, 16);

	
	let ind = 0;
	for(let i = 0; i < game.particles.length; i++) {
		const particle = game.particles[i];

		rocket_buffer[ind * 6 + 0] = -1. + particle.x / gl.canvas.width * 2;
		rocket_buffer[ind * 6 + 1] = -1. + particle.y / gl.canvas.height * 2;
		rocket_buffer[ind * 6 + 2] = particle.size;
		rocket_buffer[ind * 6 + 3] = particle.hue * (particle.ttl);
		ind++;

		for(let j = 0; j < particle.trace.length; j++) {
			const tracer = particle.trace[j];
			let t = j / particle.trace.length;

			rocket_buffer[ind * 6 + 0] = -1. + tracer.x / gl.canvas.width * 2;
			rocket_buffer[ind * 6 + 1] = -1. + tracer.y / gl.canvas.height * 2;
			rocket_buffer[ind * 6 + 2] = particle.size * (.2 + .3 * t);
			rocket_buffer[ind * 6 + 3] = particle.hue * (particle.ttl) * (t);
			ind++;
		}

	}

	// console.log("Num Particles:", ind);
	gl.bufferData(gl.ARRAY_BUFFER, rocket_buffer, gl.DYNAMIC_DRAW, 0, ind * 6);
	gl.drawArrays(gl.POINTS, 0, ind);


	requestAnimationFrame(loop);
}




/**
 * Copied from StackOverflow: https://stackoverflow.com/a/9493060 ; modified slightly
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 1].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
// function hslToRgb(h, s, l){
//     var r, g, b;

//     if(s == 0){
//         r = g = b = l; // achromatic
//     }else{
//         var hue2rgb = function hue2rgb(p, q, t){
//             if(t < 0) t += 1;
//             if(t > 1) t -= 1;
//             if(t < 1/6) return p + (q - p) * 6 * t;
//             if(t < 1/2) return q;
//             if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
//             return p;
//         }

//         var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
//         var p = 2 * l - q;
//         r = hue2rgb(p, q, h + 1/3);
//         g = hue2rgb(p, q, h);
//         b = hue2rgb(p, q, h - 1/3);
//     }

//     // return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
//     return [r, g, b];
// }








