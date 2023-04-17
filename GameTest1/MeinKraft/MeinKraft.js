import * as webgl from './WebGL.js';
import * as mat4 from './glMatrix/mat4.js';
import * as vec4 from './glMatrix/vec4.js';
import * as vec3 from './glMatrix/vec3.js';

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
let shaderIndexBuffer;
let mvpUniformLocation;


const MAX_VERTICES = 1024 * 1024;
let vertex_buffer = new Float32Array(MAX_VERTICES * 6);

const MAX_TRIANGLES = 1024 * 1024;
let index_buffer = new Int16Array(MAX_TRIANGLES * 3);


let game = {
	rockets: [],
	particles: [],
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

	gl.disable(gl.CULL_FACE);
	// gl.enable(gl.CULL_FACE);
	// gl.cullFace(gl.BACK);

	// // MVP:
	// let eye = vec3.fromValues(0., 0., 2.);
	// let target = vec3.fromValues(0., 0., 0.);
	// mat4.lookAt(view, eye, target, up);

	// mat4.perspective(
	// 	projection, 60 * 2 * 3.1415926 / 360,
	// 	gl.canvas.width / gl.canvas.height,
	// 	.01, 1000);


	// // mat4.fromRotation(model, 10 * 3.1415926535 / 180, vec3.fromValues(0, 0, -1));
	// // mat4.fromRotation(model, 10 * 3.1415926535 / 180, vec3.fromValues(1, 0, 0));
	

	// mat4.copy(uniformMatrix, projection); // uniformMatrix = projection
	// mat4.multiply(uniformMatrix, uniformMatrix, view); // uniformMatrix *= view
	// mat4.multiply(uniformMatrix, uniformMatrix, model); // uniformMatrix *= model

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




	// MVP:
	// let eye = vec3.fromValues(0., 0., 2.);
	let eye = vec3.fromValues(Math.abs((prevTime * .03 % 100 * .02) - 1) * 2 - 1, 0., 2);
	let target = vec3.fromValues(0., 0., 0.);
	mat4.lookAt(view, eye, target, up);

	mat4.perspective(
		projection, 60 * 2 * 3.1415926 / 360,
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
		[-1, -1, -1],
		[ 1, -1, -1],
		[-1,  1, -1],
		[ 1,  1, -1],
		[-1, -1,  1],
		[ 1, -1,  1],
		[-1,  1,  1],
		[ 1,  1,  1],
	];

	const cubeFaces = [
		[0, 1, 2, 1, 2, 3],
	];

	let vertCount = 0;
	let indCount = 0;
	for(let f = 0; f < cubeFaces; f++) {
		const face = cubeFaces[f];

		for(let i = 0; i < 6; i++) {
			const vertInd = face[i];

			for(let dim = 0; dim < 3; dim++) {
				vertex_buffer[vertCount * 6 + dim] = cubeVerts[vertInd][dim];
				vertex_buffer[vertCount * 6 + 3 + dim] = 1.;
			}
			vertCount++;
		}
		// for(let v = 0; v < 8; v++) {
		// 	const vertInd = face[v];

		// 	for(let dim = 0; dim < 3; dim++) {
		// 		vertex_buffer[vertCount * 6 + dim] = cubeVerts[vertInd][dim];
		// 		vertex_buffer[vertCount * 6 + 3 + dim] = 1.;
		// 	}
		// 	vertCount++;
		// }
	}

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

	const NUM_VERTS = 4;
	const NUM_TRIS = 2;

	gl.bindBuffer(gl.ARRAY_BUFFER, shaderPositionBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shaderIndexBuffer);

	gl.bufferData(gl.ARRAY_BUFFER, vertex_buffer, gl.DYNAMIC_DRAW, 0, NUM_VERTS * 6);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index_buffer, gl.DYNAMIC_DRAW, 0, NUM_TRIS * 3);

	gl.drawElements(gl.TRIANGLES, NUM_TRIS * 3, gl.UNSIGNED_SHORT, 0);


	requestAnimationFrame(loop);
}