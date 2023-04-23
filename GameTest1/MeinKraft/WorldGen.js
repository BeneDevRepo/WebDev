import {
	BlockType,
	CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH,
	SUB_CHUNK_WIDTH, SUB_CHUNK_HEIGHT, SUB_CHUNK_DEPTH,
	makeArray
}  from './general.js';

export function generateSubchunk(cx, cy, cz) {
	// if (cy*SUB_CHUNK_HEIGHT > 20) return null;

	let blocks = makeArray(SUB_CHUNK_WIDTH, SUB_CHUNK_HEIGHT, SUB_CHUNK_DEPTH); // [x][y][z]
	for(let x = 0; x < SUB_CHUNK_WIDTH; x++) {
		for(let y = 0; y < SUB_CHUNK_HEIGHT; y++) {
			for(let z = 0; z < SUB_CHUNK_DEPTH; z++) {
				blocks[x][y][z] = 
					(Math.floor(Math.floor(x/2)+Math.floor(y/2)+Math.floor(z/2)) % 2 == 0)
						|| cy*SUB_CHUNK_HEIGHT+y > 20
					// (Math.floor(x+y+z) % 2 == 0)
					// (Math.floor(x+y+z) % 2 == 0)
					// false
					? BlockType.AIR
					: BlockType.STONE;
			}
		}
	}
	return blocks;
}


