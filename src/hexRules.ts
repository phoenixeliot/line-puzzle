export function getNeighborDirections(position) {
  if (position.x % 2 == 0) {
    // even columns are down
    return [
      // hex -> gridish
      { dx: -1, dy: 0 }, // upleft -> left
      { dx: 0, dy: -1 }, // up -> up
      { dx: 1, dy: 0 }, // upright -> right
      { dx: 1, dy: 1 }, // downright -> downright
      { dx: 0, dy: 1 }, // down -> down
      { dx: -1, dy: 1 }, // downleft -> downleft
    ];
  } else {
    // odd columns are up
    return [
      // hex -> gridish
      { dx: -1, dy: -1 }, // upleft -> upleft
      { dx: 0, dy: -1 }, // up -> up
      { dx: 1, dy: -1 }, // upright -> upright
      { dx: 1, dy: 0 }, // downright -> right
      { dx: 0, dy: 1 }, // down -> down
      { dx: -1, dy: 0 }, // downleft > left
    ];
  }
}

const hexRules = {
  getNeighborDirections,
};

export default hexRules;
