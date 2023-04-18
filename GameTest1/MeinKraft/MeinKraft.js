import * as webgl from './WebGL.js';
import * as mat4 from './glMatrix/mat4.js';
import * as vec4 from './glMatrix/vec4.js';
import * as vec3 from './glMatrix/vec3.js';

const vert = x => x;
const frag = x => x;

Number.prototype.clamp = function(min, max) {
	return Math.min(Math.max(this, min), max);
};

const BlockType = Object.freeze({
	AIR: "Air",
	STONE: "Stone",
	DIRT: "Dirt",
	GRASS: "Grass",
});


let canvas;
let gl;
let shaderProgram;
let shaderPositionAttributeLocation;
let shaderColorAttributeLocation
let shaderPositionBuffer;
let shaderIndexBuffer;
let mvpUniformLocation;


const MAX_VERTICES = 1024 * 1024;
let vertex_buffer = new Float32Array(MAX_VERTICES * 6);

const MAX_TRIANGLES = 1024 * 1024;
let index_buffer = new Int16Array(MAX_TRIANGLES * 3);


let game = {
	keys: {
		"w": false,
		"a": false,
		"s": false,
		"d": false,
	},
	player: {
		pos: vec3.fromValues(4, 0, 10),
		eye: vec3.fromValues(0, 1.8, 0),
		rx: 0., // rotation around x axis (-90 ... 90)
		ry: 0., // rotation around y axis (0 ... 360)
	},
	chunks: [],
};


const up = vec3.fromValues(0., 1., 0.);
let model = mat4.create();
let view = mat4.create();
let projection = mat4.create();
let uniformMatrix = mat4.create();


window.onload = function onload() {
	canvas = document.getElementById("mainCanvas");
	gl = webgl.getContext(canvas);

	const vertexSource = vert`\
		#version 300 es
		precision highp float;

		uniform mat4 u_mvp; // proj * view * model

		in vec3 a_position;
		in vec3 a_color;

		out vec3 color;

		void main() {
			color = a_color;
			// gl_Position = vec4(a_position, 1.);
			gl_Position = u_mvp * vec4(a_position, 1.);
		}
		`;

	const fragmentSource = frag`\
		#version 300 es
		precision highp float;

		in vec3 color;

		out vec4 fragColor;
		
		void main() {
			fragColor = vec4(color, 1.);
		}
		`;

	shaderProgram = webgl.createShaderProgram(gl, vertexSource, fragmentSource);

	shaderPositionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
	shaderColorAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_color');
	shaderPositionBuffer = gl.createBuffer();
	shaderIndexBuffer = gl.createBuffer();

	mvpUniformLocation = gl.getUniformLocation(shaderProgram, "u_mvp");



	// tell the shader to load our data from the buffer we just made:
	gl.enableVertexAttribArray(shaderPositionAttributeLocation);
	gl.enableVertexAttribArray(shaderColorAttributeLocation);

	gl.bindBuffer(gl.ARRAY_BUFFER, shaderPositionBuffer);
	// gl.bindBuffer(gl.INDEX_BUFFER, shaderIndexBuffer);
	gl.vertexAttribPointer(shaderPositionAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 0); // 3-dim floats, don't normalize, stride between points, initial offset
	gl.vertexAttribPointer(shaderColorAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 3 * 4); // 3-dim floats, don't normalize, stride between points, initial offset
	
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	
	document.onkeydown = keyDown;
	document.onkeyup = keyUp;
	
	let capt =
	() => {
		const promise = canvas.requestPointerLock({
			unadjustedMovement: true,
		});

		if(!promise) {
			console.log("Error trying to capture cursor!");
			return;
		}
		
		promise
			.then(() => console.log("Captured Mouse"))
			.catch((error) => console.log("Error trying to capture cursor:", error.name));

	};
	// capt();
	canvas.onclick = capt;
	canvas.onmousemove = mouseMove;
	
	
	// backface culling:
	// gl.disable(gl.CULL_FACE);
	gl.enable(gl.CULL_FACE);
	// gl.cullFace(gl.BACK);
	gl.cullFace(gl.FRONT);


	// depth testing
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);


	let blocks = [];
	for(let y = 0; y < 4; y++) {
		let layer = [];

		for(let z = 0; z < 4; z++) {
			let strip = [];

			for(let x = 0; x < 4; x++) {
				if(y < 2)
					strip.push(BlockType.STONE);
				else
					strip.push(
						Math.floor(x+y+z)%2==0
						? BlockType.AIR
						: BlockType.STONE);
			}

			layer.push(strip)
		}

		blocks.push(layer);
	}

	let chunk = {
		x: 0, z: 0,
		blocks: [],
	};
	chunk.blocks = blocks;
	
	game.chunks.push(chunk);

	// console.log(chunk)

	
	requestAnimationFrame(loop);
}

function keyDown(event) {
	game.keys[event.key.toLowerCase()] = true;
	// console.log("Key Down: ", event.key, event.keyCode);
}

function keyUp(event) {
	game.keys[event.key.toLowerCase()] = false;
}

function mouseMove(event) {
	let dx = event.movementX;
	let dy = event.movementY;
	if(document.pointerLockElement != null) { // if mouse is captured
		game.player.rx -= dy * .01;
		game.player.ry -= dx * .01;
		// console.log(dx, dy);
	}
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


	let vel = vec3.create();
	if(game.keys["w"])
		vec3.add(vel, vel, vec3.fromValues(0, 0, -1));
	if(game.keys["s"])
		vec3.add(vel, vel, vec3.fromValues(0, 0, 1));

	if(game.keys["a"])
		vec3.add(vel, vel, vec3.fromValues(-1, 0, 0));
	if(game.keys["d"])
		vec3.add(vel, vel, vec3.fromValues(1, 0, 0));

	if(game.keys["shift"])
		vec3.add(vel, vel, vec3.fromValues(0, -1, 0));
	if(game.keys[" "])
		vec3.add(vel, vel, vec3.fromValues(0, 1, 0));

	vec3.scale(vel, vel, dt);
	// console.log(vel);
	vec3.add(game.player.pos, game.player.pos, vel);
	


	// MVP:
	// let eye = vec3.fromValues(0., 0., 2.);
	// let eye = vec3.fromValues(Math.abs((prevTime * .03 % 100 * .02) - 1) * 4 - 2, 2., 8);
	let eye = vec3.create();
	vec3.add(eye, game.player.pos, game.player.eye);
	// let target = vec3.fromValues(0., 0., 0.);
	// mat4.lookAt(view, eye, target, up);
	let lookDir = vec3.fromValues(0, 0, -1);
	vec3.rotateX(lookDir, lookDir, vec3.create(), game.player.rx);
	vec3.rotateY(lookDir, lookDir, vec3.create(), game.player.ry);
	let target = vec3.create();
	vec3.add(target, eye, lookDir);

	mat4.lookAt(view, eye, target, up);

	mat4.perspective(
		projection, 90 * 2 * 3.1415926 / 360,
		gl.canvas.width / gl.canvas.height,
		.01, 1000);

	mat4.copy(uniformMatrix, projection); // uniformMatrix = projection
	mat4.multiply(uniformMatrix, uniformMatrix, view); // uniformMatrix *= view
	mat4.multiply(uniformMatrix, uniformMatrix, model); // uniformMatrix *= model

	
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
	// gl.uniform1f(pointSizeUniformLocation, 20);
	gl.uniformMatrix4fv(mvpUniformLocation, false, uniformMatrix);

	const cubeVerts = [
		[0, 1, 0],
		[1, 1, 0],
		[0, 0, 0],
		[1, 0, 0],
		[0, 1, 1],
		[1, 1, 1],
		[0, 0, 1],
		[1, 0, 1],
	];


	// 0 1  back
	// 2 3

	// 4 5  front
	// 6 7

	const cubeFaces = [
		[[1, 0, 3, 2], [0, 1, 2, 1, 3, 2]], // back
		[[4, 5, 6, 7], [0, 1, 2, 1, 3, 2]], // front
		[[0, 4, 2, 6], [0, 1, 2, 1, 3, 2]], // left
		[[5, 1, 7, 3], [0, 1, 2, 1, 3, 2]], // right
		[[0, 1, 4, 5], [0, 1, 2, 1, 3, 2]], // top
		[[6, 7, 2, 3], [0, 1, 2, 1, 3, 2]], // bottom
	];

	const colors = [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1],
	];

	let vertCount = 0;
	let indCount = 0;

	let emitCube = (x, y, z) => {
		for(let f = 0; f < cubeFaces.length; f++) {
			const face = cubeFaces[f];
	
			const verts = face[0];
			const inds = face[1];
	
			const vertCountBefore = vertCount;
			const color = colors[Math.floor(f / 2)];
	
			for(let v = 0; v < 4; v++) {
				const vert = verts[v];
	
				vertex_buffer[vertCount * 6 + 0] = cubeVerts[vert][0] + x;
				vertex_buffer[vertCount * 6 + 1] = cubeVerts[vert][1] + y;
				vertex_buffer[vertCount * 6 + 2] = cubeVerts[vert][2] + z;
				vertex_buffer[vertCount * 6 + 3] = color[0];
				vertex_buffer[vertCount * 6 + 4] = color[1];
				vertex_buffer[vertCount * 6 + 5] = color[2];
				// vertex_buffer[vertCount * 6 + 3] = 1.;
				// vertex_buffer[vertCount * 6 + 4] = 1.;
				// vertex_buffer[vertCount * 6 + 5] = 1.;
	
				vertCount++;
			}
		
			for(let i = 0; i < 6; i++) {
				const ind = inds[i];
	
				index_buffer[indCount] = vertCountBefore + ind;
	
				indCount++;
			}
		}
	};

	for(const chunk of game.chunks) {
		for(let y = 0; y < 4; y++) {
			for(let z = 0; z < 4; z++) {
				for(let x = 0; x < 4; x++) {
					if(chunk.blocks[y][z][x] != BlockType.AIR)
						emitCube(x, y, z);
				}
			}
		}
	}

	// emitCube(0, 0, 0);
	// emitCube(1, 0, 0);
	// emitCube(0, 1, 0);
	// emitCube(-1, -1, 0);


	// console.log("Vertices", vertex_buffer);
	// console.log("Indices", index_buffer);
	// return;

	// vertex_buffer[0 * 6 + 0] = -1;
	// vertex_buffer[0 * 6 + 1] = 0;
	// vertex_buffer[0 * 6 + 2] = 0;
	// vertex_buffer[0 * 6 + 3] = 1.;
	// vertex_buffer[0 * 6 + 4] = 0;
	// vertex_buffer[0 * 6 + 5] = 0;

	// vertex_buffer[1 * 6 + 0] = 0;
	// vertex_buffer[1 * 6 + 1] = 1;
	// vertex_buffer[1 * 6 + 2] = 0;
	// vertex_buffer[1 * 6 + 3] = 0;
	// vertex_buffer[1 * 6 + 4] = 1.;
	// vertex_buffer[1 * 6 + 5] = 0;

	// vertex_buffer[2 * 6 + 0] = 0;
	// vertex_buffer[2 * 6 + 1] = 0;
	// vertex_buffer[2 * 6 + 2] = 0;
	// vertex_buffer[2 * 6 + 3] = 0;
	// vertex_buffer[2 * 6 + 4] = 0;
	// vertex_buffer[2 * 6 + 5] = 1.;

	// vertex_buffer[3 * 6 + 0] = -1;
	// vertex_buffer[3 * 6 + 1] = 1;
	// vertex_buffer[3 * 6 + 2] = 0;
	// vertex_buffer[3 * 6 + 3] = 1;
	// vertex_buffer[3 * 6 + 4] = 0;
	// vertex_buffer[3 * 6 + 5] = 1.;

	// index_buffer[0] = 0;
	// index_buffer[1] = 1;
	// index_buffer[2] = 2;
	// index_buffer[3] = 1;
	// index_buffer[4] = 2;
	// index_buffer[5] = 3;

	const NUM_VERTS = vertCount;
	const NUM_TRIS = indCount / 3;
	// const NUM_VERTS = 4;
	// const NUM_TRIS = 2;

	gl.bindBuffer(gl.ARRAY_BUFFER, shaderPositionBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shaderIndexBuffer);

	gl.bufferData(gl.ARRAY_BUFFER, vertex_buffer, gl.DYNAMIC_DRAW, 0, NUM_VERTS * 6);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index_buffer, gl.DYNAMIC_DRAW, 0, NUM_TRIS * 3);

	gl.drawElements(gl.TRIANGLES, NUM_TRIS * 3, gl.UNSIGNED_SHORT, 0);


	requestAnimationFrame(loop);
}