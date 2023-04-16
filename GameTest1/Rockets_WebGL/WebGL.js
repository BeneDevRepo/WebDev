export function getContext(canvas) {
	let gl = canvas.getContext('webgl2');
	if(!gl)
		throw new Error('WebGL::getContext(canvas): Could not get webgl context');
	return gl;
}


export function createShader(gl, type, source) {
	let shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

	if(success)
		return shader;


	console.error(gl.getShaderInfoLog(shader));
	throw new Error('Shader failed to compile');
}


export function createShaderProgram(gl, vertexSource, fragmentSource) {
	var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
	var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	var success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if(success)
		return program;

	console.error(gl.getProgramInfoLog(program));
	throw new Error('Shader program failed to link');
};