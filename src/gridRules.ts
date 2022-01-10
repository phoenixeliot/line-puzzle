// Other possible rules to vary:
// - Must fill entire board

class Directions {
  // TODO Move calculation of next clockwise direction into here from Area
}

export function getNeighborDirections(position) {
  return [
    // Pure cardinal directions, clockwise
    { dx: 0, dy: -1 }, // up
    { dx: 1, dy: 0 }, // right
    { dx: 0, dy: 1 }, // down
    { dx: -1, dy: 0 }, // left
  ];
}

const gridRules = {
  getNeighborDirections,
};

export default gridRules;
