export const BlockType = Object.freeze({
	// AIR: "Air",
	// STONE: "Stone",
	// DIRT: "Dirt",
	// GRASS: "Grass",
	AIR: 1,
	STONE: 2,
	DIRT: 3,
	GRASS: 4,
});

export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 256;
export const CHUNK_DEPTH = 16;

export const SUB_CHUNK_WIDTH = 16;
export const SUB_CHUNK_HEIGHT = 16;
export const SUB_CHUNK_DEPTH = 16;

export function makeArray(...dimensions) {
	if(dimensions.length == 1)
		return new Array(dimensions[0]);

	let arr = new Array(dimensions[0]);
	for(let i = 0; i < arr.length; i++)
		arr[i] = makeArray(...dimensions.slice(1));

	return arr;
}