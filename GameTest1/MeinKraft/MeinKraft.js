import * as webgl from './WebGL.js';
import * as mat4 from './glMatrix/mat4.js';
import * as vec3 from './glMatrix/vec3.js';
import * as worldgen from './WorldGen.js';

import {
	BlockType,
	CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH,
	SUB_CHUNK_WIDTH, SUB_CHUNK_HEIGHT, SUB_CHUNK_DEPTH,
	makeArray
} from './general.js';


const vert = x => x;
const frag = x => x;

Number.prototype.clamp = function(min, max) {
	return Math.min(Math.max(this, min), max);
};


let canvas;
let gl;

let shaderProgram;

// let shaderPositionBuffer; // VBO
let shaderPositionAttributeLocation;

// let shaderIndexBuffer; // IBO / EBO
let shaderColorAttributeLocation;

// let VAO;

let texture;

let mvpUniformLocation;
let textureUniformLocation;


// const MAX_VERTICES = 1024 * 1024;
// let vertex_buffer = new Float32Array(MAX_VERTICES * 6);

// const MAX_TRIANGLES = 1024 * 1024;
// let index_buffer = new Int16Array(MAX_TRIANGLES * 3);

let game = {
	keys: {
		"w": false,
		"a": false,
		"s": false,
		"d": false,
	},
	player: {
		pos: vec3.fromValues(4, 30, 30),
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

	let worker = new Worker("MeshGen.js");
	worker.onmessage = (e) => {
		// console.log("Event:");
		// console.log(e.data);
	}

	worker.postMessage({a: 8, b: [7, 6]});

	const vertexSource = vert`\
		#version 300 es
		precision highp float;

		uniform mat4 u_mvp; // proj * view * model

		in vec3 a_position;
		in vec3 a_color;

		out vec3 color;

		void main() {
			color = a_color;
			gl_Position = u_mvp * vec4(a_position, 1.);
		}
		`;

	const fragmentSource = frag`\
		#version 300 es
		precision highp float;

		in vec3 color;

		uniform sampler2D u_texture;

		out vec4 fragColor;
		
		void main() {
			// fragColor = vec4(color, 1.);
			fragColor = vec4(texture(u_texture, color.xy).rgb, 1.);
		}
		`;

	shaderProgram = webgl.createShaderProgram(gl, vertexSource, fragmentSource);

	shaderPositionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
	shaderColorAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_color');
	// shaderPositionBuffer = gl.createBuffer();
	// shaderIndexBuffer = gl.createBuffer();
	// VAO = gl.createVertexArray(); // vertex attribute array

	mvpUniformLocation = gl.getUniformLocation(shaderProgram, "u_mvp");
	textureUniformLocation = gl.getUniformLocation(shaderProgram, "u_texture");


	// Flip image pixels into the bottom-to-top order that WebGL expects.
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	texture = webgl.loadTexture(gl, "rick.jpg");

	// VAO = gl.createVertexArray(); // vertex attribute array
	// shaderPositionBuffer = gl.createBuffer();
	// shaderIndexBuffer = gl.createBuffer();

	
	// gl.bindVertexArray(VAO);
	// gl.bindBuffer(gl.ARRAY_BUFFER, shaderPositionBuffer);
	// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shaderIndexBuffer);
	// gl.enableVertexAttribArray(shaderPositionAttributeLocation);
	// gl.enableVertexAttribArray(shaderColorAttributeLocation);
	// gl.vertexAttribPointer(shaderPositionAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 0); // 3-dim floats, don't normalize, stride between points, initial offset
	// gl.vertexAttribPointer(shaderColorAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 3 * 4); // 3-dim floats, don't normalize, stride between points, initial offset
	// gl.bindVertexArray(null);
	
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	
	document.onkeydown = keyDown;
	document.onkeyup = keyUp;

	document.addEventListener(
		'beforeunload',
		function(e){
			e.stopPropagation();e.preventDefault();return false;
		},
		true
	);
	
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


	const create_subchunk = (x, y, z) => {
		// const blocks = create_blocks(x, y, z);
		const blocks = worldgen.generateSubchunk(x, y, z);

		// const MAX_VERTICES = SUB_CHUNK_WIDTH * SUB_CHUNK_HEIGHT * SUB_CHUNK_DEPTH * 4   * 10; // 163.840
		// const MAX_INDICES = SUB_CHUNK_WIDTH * SUB_CHUNK_HEIGHT * SUB_CHUNK_DEPTH * 6    * 10; // 245.760
		const MAX_VERTICES = SUB_CHUNK_WIDTH * SUB_CHUNK_HEIGHT * SUB_CHUNK_DEPTH * 4 * 3; // 163.840
		const MAX_INDICES = SUB_CHUNK_WIDTH * SUB_CHUNK_HEIGHT * SUB_CHUNK_DEPTH * 6 * 3; // 245.760

		const VAO = gl.createVertexArray(); // vertex attribute array
		const VBO = gl.createBuffer();
		const EBO = gl.createBuffer();

		gl.bindVertexArray(VAO);
		gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, EBO);
		gl.vertexAttribPointer(shaderPositionAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 0); // 3-dim floats, don't normalize, stride between points, initial offset
		gl.vertexAttribPointer(shaderColorAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 3 * 4); // 3-dim floats, don't normalize, stride between points, initial offset
		gl.enableVertexAttribArray(shaderPositionAttributeLocation);
		gl.enableVertexAttribArray(shaderColorAttributeLocation);
		gl.bindVertexArray(null);

		// const empty = blocks == null;

		return {
			"x": x, "y": y, "z": z,
			width: SUB_CHUNK_WIDTH, height: SUB_CHUNK_HEIGHT, depth: SUB_CHUNK_DEPTH,
			"blocks": blocks,

			mesh: {
				// CPU:
				vertices: new Float32Array(MAX_VERTICES * 6),
				indices: new Int32Array(MAX_INDICES),
				// vertices: empty ? null : new Float32Array(MAX_VERTICES * 6),
				// indices: empty ? null : new Int32Array(MAX_INDICES),
				numVertices: 0, numIndices: 0,
				cubesChanged: true,

				// GPU:
				"VAO": VAO, "VBO": VBO, "EBO": EBO,
				meshChanged: false,
			},
		}
	}

	const create_chunk = (x, z) => {
		const NUM_VERTICAL_SUBCHUNKS = 16;
		// return create_subchunk(x, 0, z);
		let subchunks = makeArray(NUM_VERTICAL_SUBCHUNKS);
		for(let i = 0; i < subchunks.length; i++) {
			subchunks[i] = create_subchunk(x, i, z);
		}

		const VAO = gl.createVertexArray(); // vertex attribute array
		const VBO = gl.createBuffer();
		const EBO = gl.createBuffer();

		gl.bindVertexArray(VAO);
		gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, EBO);
		gl.vertexAttribPointer(shaderPositionAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 0); // 3-dim floats, don't normalize, stride between points, initial offset
		gl.vertexAttribPointer(shaderColorAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 3 * 4); // 3-dim floats, don't normalize, stride between points, initial offset
		gl.enableVertexAttribArray(shaderPositionAttributeLocation);
		gl.enableVertexAttribArray(shaderColorAttributeLocation);
		gl.bindVertexArray(null);

		return {
			"x": x, "y": 0, "z": z,
			width: CHUNK_WIDTH, height: CHUNK_HEIGHT, depth: CHUNK_DEPTH,
			"subchunks": subchunks,

			mesh: {
				// CPU:
				vertices: new Float32Array(subchunks[0].mesh.vertices.length * subchunks.length),
				indices: new Int32Array(subchunks[0].mesh.indices.length * subchunks.length),
				numVertices: 0, numIndices: 0,
				cubesChanged: true,

				// GPU:
				"VAO": VAO, "VBO": VBO, "EBO": EBO,
				meshChanged: false,
			}
		};
	};

	game.chunks = {};

	// game.chunks[[-1, 0]] = create_chunk(-1, 0);
	// game.chunks[[0, 0]] = create_chunk(0, 0);
	// game.chunks[[1, 0]] = create_chunk(1, 0);
	for(let x = 0; x < 8; x++)
		for(let z = 0; z < 8; z++)
			game.chunks[[x, z]] = create_chunk(x, z);

	// console.log(game.chunks);

	// setInterval(() => {
	// 	let chunk = game.chunks[[0, 0]];
	// 	let subchunk = chunk.subchunks[0];
	// 	let block = subchunk.blocks[0][0][0] != BlockType.AIR
	// 	for(let x = 0; x < 16; x++)
	// 		for(let z = 0; z < 16; z++)
	// 			subchunk.blocks[x][0][z] = block ? BlockType.AIR : BlockType.DIRT;
	// 	subchunk.mesh.cubesChanged = true;
	// 	chunk.mesh.cubesChanged = true;
	// }, 500);

	
	requestAnimationFrame(loop);
}

// prevent accidentally closing tab
// window.onbeforeunload = function (e) {
//     // Cancel the event
//     e.preventDefault();

//     // Chrome requires returnValue to be set
//     e.returnValue = 'Really want to quit the game?';
// };

function keyDown(event) {
	game.keys[event.key.toLowerCase()] = true;
	// console.log("Key Down: ", event.key, event.keyCode);
}

function keyUp(event) {
	game.keys[event.key.toLowerCase()] = false;
}

function mouseMove(event) {
	const degPerPixel = .2;
	let dx = event.movementX;
	let dy = event.movementY;
	if(document.pointerLockElement != null) { // if mouse is captured
		game.player.rx -= dy * degPerPixel * 3.1415926535 / 180;
		game.player.ry -= dx * degPerPixel * 3.1415926535 / 180;
		game.player.rx = game.player.rx.clamp(-3.1414/2, 3.1414/2);
		// console.log(dx, dy);
	}
}

let prevTime = performance.now();
function loop() {
	const curTime = performance.now();
	const dt = (curTime - prevTime) / 1000.;
	prevTime = curTime;

	gl.canvas.width  = window.innerWidth;
	gl.canvas.height = window.innerHeight;

	document.getElementById("fps").innerText = "Fps: " + Math.floor(1. / dt);


	const speed = 6.; // blocks / sec
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
		
	vec3.scale(vel, vel, speed * dt);

	// vec3.rotateX(vel, vel, vec3.create(), game.player.rx);
	vec3.rotateY(vel, vel, vec3.create(), game.player.ry);
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
	
	// set uniforms
	// gl.uniform1f(pointSizeUniformLocation, 20);
	gl.uniformMatrix4fv(mvpUniformLocation, false, uniformMatrix);

	// setup texture
	gl.activeTexture(gl.TEXTURE0); // next commands should affect texture unit 0
	gl.bindTexture(gl.TEXTURE_2D, texture); // bind texture to texture unit 0
	gl.uniform1i(textureUniformLocation, 0); // set sampler to reference texture unit 0

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

	const uvCoords = [
		[0, 1],
		[1, 1],
		[0, 0],
		[1, 0],
	];

	const cubeFaces = [
		[[0, 4, 2, 6], [0, 1, 2, 1, 3, 2]], // left
		[[5, 1, 7, 3], [0, 1, 2, 1, 3, 2]], // right
		[[6, 7, 2, 3], [0, 1, 2, 1, 3, 2]], // bottom
		[[0, 1, 4, 5], [0, 1, 2, 1, 3, 2]], // top
		[[1, 0, 3, 2], [0, 1, 2, 1, 3, 2]], // back
		[[4, 5, 6, 7], [0, 1, 2, 1, 3, 2]], // front
	];

	// const colors = [
	// 	[1, 0, 0],
	// 	[0, 1, 0],
	// 	[0, 0, 1],
	// ];


	let emitCube = (x, y, z, cull={}, vertices, indices, numVertices, numIndices) => {
		for(let f = 0; f < cubeFaces.length; f++) {
			if(cull[f]) continue;

			const face = cubeFaces[f];
	
			const verts = face[0];
			const inds = face[1];

			const vertCountBefore = numVertices;
			// const color = colors[Math.floor(f / 2)];
	
			for(let v = 0; v < 4; v++) {
				const vert = verts[v];

				vertices[numVertices * 6 + 0] = x + cubeVerts[vert][0];
				vertices[numVertices * 6 + 1] = y + cubeVerts[vert][1];
				vertices[numVertices * 6 + 2] = z + cubeVerts[vert][2];
				vertices[numVertices * 6 + 3] = uvCoords[v][0];
				vertices[numVertices * 6 + 4] = uvCoords[v][1];
				vertices[numVertices * 6 + 5] = 0.;
				// vertices[numVertices * 6 + 3] = color[0];
				// vertices[numVertices * 6 + 4] = color[1];
				// vertices[numVertices * 6 + 5] = color[2];
	
				numVertices++;
			}
		
			for(let i = 0; i < 6; i++) {
				const ind = inds[i];
	
				indices[numIndices] = vertCountBefore + ind;
	
				numIndices++;
			}
		}

		return [numVertices, numIndices];
	};

	// for(const chunk of game.chunks) {
	for(let [chunkPos, chunk] of Object.entries(game.chunks)) {
		if(!chunk.mesh.cubesChanged)
			continue;

		for(let subchunk of chunk.subchunks) {
			if(!subchunk.mesh.cubesChanged)
				continue;

			subchunk.mesh.cubesChanged = false;
			subchunk.mesh.meshChanged = true;
			
			const blocks = subchunk.blocks;

			subchunk.mesh.numVertices=0;
			subchunk.mesh.numIndices=0;
			
			for(let y = 0; y < subchunk.height; y++) {
				for(let z = 0; z < subchunk.depth; z++) {
					for(let x = 0; x < subchunk.width; x++) {
						if(blocks[x][y][z] != BlockType.AIR) {
							let cull = {};
							for(let dim = 0; dim < 3; dim++) {
								const pos = [x, y, z];
								const size = [subchunk.width, subchunk.height, subchunk.depth];
								let posMin = [x, y, z]; posMin[dim]--;
								let posMax = [x, y, z]; posMax[dim]++;

								if(pos[dim] > 0)
									if(blocks[posMin[0]][posMin[1]][posMin[2]] != BlockType.AIR)
										cull[dim * 2] = true;
								if(pos[dim] < size[dim]-1)
									if(blocks[posMax[0]][posMax[1]][posMax[2]] != BlockType.AIR)
										cull[dim * 2 + 1] = true;
							}

							const [vertCount, indCount] = emitCube(
								subchunk.x * subchunk.width + x,
								subchunk.y * subchunk.height + y,
								subchunk.z * subchunk.depth + z,
								cull,
								subchunk.mesh.vertices,
								subchunk.mesh.indices,
								subchunk.mesh.numVertices,
								subchunk.mesh.numIndices
								);
							subchunk.mesh.numVertices=vertCount;
							subchunk.mesh.numIndices=indCount;
						}
					}
				}
			}
		}

		chunk.mesh.numVertices = 0;
		chunk.mesh.numIndices = 0;
		for(const subchunk of chunk.subchunks) {
			// const numVerticesBefore = chunk.mesh.numVertices;

			for(let vert = 0; vert < subchunk.mesh.numVertices * 6; vert++) {
				chunk.mesh.vertices[chunk.mesh.numVertices * 6 + vert] =
					subchunk.mesh.vertices[vert];
			}

			for(let ind = 0; ind < subchunk.mesh.numIndices; ind++) {
				chunk.mesh.indices[chunk.mesh.numIndices + ind] =
					chunk.mesh.numVertices + subchunk.mesh.indices[ind];
			}

			chunk.mesh.numVertices += subchunk.mesh.numVertices;
			chunk.mesh.numIndices += subchunk.mesh.numIndices;
		}

		chunk.mesh.cubesChanged = false;
		chunk.mesh.meshChanged = true;
	}

	// emitCube(0, 0, 0);
	// emitCube(1, 0, 0);
	// emitCube(0, 1, 0);
	// emitCube(-1, -1, 0);

	// gl.bindVertexArray(VAO);

	// gl.bindBuffer(gl.ARRAY_BUFFER, shaderPositionBuffer);
	// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shaderIndexBuffer);

	for(const [chunkPos, chunk] of Object.entries(game.chunks)) {
		if(!chunk.mesh.cubesChanged) {
			gl.bindVertexArray(chunk.mesh.VAO);
				
			if(chunk.mesh.meshChanged) {
				chunk.mesh.meshChanged = false;
				gl.bindBuffer(gl.ARRAY_BUFFER, chunk.mesh.VBO);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, chunk.mesh.EBO);

				gl.bufferData(gl.ARRAY_BUFFER, chunk.mesh.vertices, gl.DYNAMIC_DRAW, 0, chunk.mesh.numVertices * 6);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, chunk.mesh.indices, gl.DYNAMIC_DRAW, 0, chunk.mesh.numIndices);
			}

			gl.drawElements(gl.TRIANGLES, chunk.mesh.numIndices, gl.UNSIGNED_INT, 0);
			// gl.bufferData(gl.ARRAY_BUFFER, chunk.mesh.vertices, gl.DYNAMIC_DRAW, 0, chunk.mesh.numVertices * 6);
			// gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, chunk.mesh.indices, gl.DYNAMIC_DRAW, 0, chunk.mesh.numIndices);
			
			// gl.drawElements(gl.TRIANGLES, chunk.mesh.numIndices, gl.UNSIGNED_INT, 0);
		} else {
			for(const subchunk of chunk.subchunks) {
				gl.bindVertexArray(subchunk.mesh.VAO);
				
				if(subchunk.mesh.meshChanged) {
					subchunk.mesh.meshChanged = false;
					gl.bindBuffer(gl.ARRAY_BUFFER, subchunk.mesh.VBO);
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, subchunk.mesh.EBO);

					gl.bufferData(gl.ARRAY_BUFFER, subchunk.mesh.vertices, gl.DYNAMIC_DRAW, 0, subchunk.mesh.numVertices * 6);
					gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, subchunk.mesh.indices, gl.DYNAMIC_DRAW, 0, subchunk.mesh.numIndices);
				}

				gl.drawElements(gl.TRIANGLES, subchunk.mesh.numIndices, gl.UNSIGNED_INT, 0);
			}
		}
	}

	// gl.bufferData(gl.ARRAY_BUFFER, vertex_buffer, gl.DYNAMIC_DRAW, 0, NUM_VERTS * 6);
	// gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index_buffer, gl.DYNAMIC_DRAW, 0, NUM_INDS);

	// gl.drawElements(gl.TRIANGLES, NUM_INDS, gl.UNSIGNED_SHORT, 0);


	requestAnimationFrame(loop);
}