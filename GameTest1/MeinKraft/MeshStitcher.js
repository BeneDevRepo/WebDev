onmessage = (e) => {
	let data = e.data;

	data = stitch(data);

	let transfer = [data.meshOut.vertices.buffer, data.meshOut.indices.buffer];

	for(const submesh of data.meshIn) {
		transfer.push(submesh.vertices.buffer);
		transfer.push(submesh.indices.buffer);
	}

	postMessage(data, transfer);
};


function stitch(data) {
	// let res = {
	// 	x: chunk.x, z: chunk.z,
	// 	vertices: chunk.vertices,
	// 	indices: chunk.indices,
	// 	numVertices: 0,
	// 	numIndices: 0,
	// 	subchunks: chunk.subchunks,
	// };


	for(const submesh of data.meshIn) {
		for(let vert = 0; vert < submesh.numVertices * 6; vert++) {
			data.meshOut.vertices[data.meshOut.numVertices * 6 + vert] =
				submesh.vertices[vert];
		}

		for(let ind = 0; ind < submesh.numIndices; ind++) {
			data.meshOut.indices[data.meshOut.numIndices + ind] =
				data.meshOut.numVertices + submesh.indices[ind];
		}

		data.meshOut.numVertices += submesh.numVertices;
		data.meshOut.numIndices  += submesh.numIndices;
	}

	return data;
}