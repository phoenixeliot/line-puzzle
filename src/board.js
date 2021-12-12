export const WALL = "#";
export const ENDPOINT_COLORS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const PATH_COLORS = "abcdefghijklmnopqrstuvwxyz";
export const COLORS = ENDPOINT_COLORS + PATH_COLORS;
export const EMPTY = "-";

export class Cell {
  constructor({ color, position, isEndpoint }) {
    this.color = color;
    this.position = position;
    this.isEndpoint = isEndpoint;
  }
}

function setIsEqual(set, otherSet) {
  return (
    set.size === otherSet.size && [...set].every((value) => otherSet.has(value))
  );
}

export class Board {
  /**
   *
   * @param {*} data - Grid cell data
   * @param {*} rules - Board rules (eg which cells are connected to others, eg grid vs hex)
   * @param {Object} options
   * @param {Boolean} options.isInitial - True if the board is completely unsolved (only endpoints on lines)
   */
  constructor(data, rules, { isInitial = false } = {}) {
    this.data = data;
    this.rules = rules;
    this.isInitial = isInitial;

    if (isInitial) {
      // Mark the starting cells as starting cells
      for (const starterCell of this.iterateFilledCells()) {
        starterCell.isEndpoint = true;
      }
    }
  }

  static fromString(boardString, rules) {
    const boardData = boardString
      .trim()
      .split("\n")
      .map((row, y) =>
        row.split("").map((color, x) => {
          return new Cell({
            color: color.toUpperCase(),
            isEndpoint: ENDPOINT_COLORS.includes(color),
            position: { x, y },
          });
        })
      );
    return new Board(boardData, rules);
  }

  toString() {
    return this.data
      .map((row) => row.map((cell) => cell.isEndpoint ? cell.color.toUpperCase() : cell.color.toLowerCase()).join(""))
      .join("\n");
  }

  isValidPosition(position) {
    return (
      position.y >= 0 &&
      position.x >= 0 &&
      position.y < this.data.length &&
      position.x < this.data[0].length &&
      this.getColor(position) !== WALL
    );
  }

  getColor(position) {
    return this.getCell(position).color;
  }

  getCell(position) {
    return this.data[position.y][position.x];
  }

  getNeighborPositions(position) {
    const directions = this.rules.getNeighborDirections(position);
    return directions
      .map((direction) => {
        const newPosition = {
          x: position.x + direction.dx,
          y: position.y + direction.dy,
        };
        if (!this.isValidPosition(newPosition)) {
          return null;
        }
        return newPosition;
      })
      .filter((c) => c);
  }

  getNeighborCells(position) {
    return this.getNeighborPositions(position).map((pos) => this.getCell(pos));
  }

  getSameColorNeighborCells(position) {
    const cell = this.getCell(position);
    return this.getNeighborCells(position).filter(
      (neighbor) => neighbor.color === cell.color
    );
  }

  getColors() {
    return new Set(
      this.data
        .flat()
        .map((cell) => cell.color)
        .filter((color) => COLORS.includes(color))
    );
  }

  *iterateFilledCells() {
    for (const cell of this.iterateCells()) {
      if (COLORS.includes(cell.color)) {
        yield cell;
      }
    }
  }

  *iterateCells() {
    for (const row of this.data) {
      for (const cell of row) {
        yield cell;
      }
    }
  }

  /**
   * Finds all the loose tails (not starter cells) of lines
   */
  *iterateTails() {
    for (const cell of this.iterateFilledCells()) {
      if (this.getSameColorNeighborCells(cell).length === 1) {
        yield cell;
      }
    }
  }

  isComplete() {
    // Make sure all cells are filled
    if (
      !this.data.every((row, y) =>
        row.every((cell, x) => (WALL + COLORS).includes(cell.color))
      )
    ) {
      return false;
    }
    // Make sure every color has a path along itself to all other cells of that color
    return Array.from(this.getColors()).every((color) => {
      // Each color should have exactly 2 cells with 1 connection to its own color each, and all the rest should have 2 connections.
      const counts = new Set(
        Array.from(this.iterateCells())
          .filter((c) => c.color === color)
          .map((cell) => {
            const sameColorNeighbors = this.getSameColorNeighborCells(
              cell.position
            );
            const numSameColorNeighbors = sameColorNeighbors.length;
            return numSameColorNeighbors;
          })
      );
      debugger;
      return (
        setIsEqual(counts, new Set([1, 2])) || setIsEqual(counts, new Set([1]))
      );
    });
  }

  /**
   * Checks whether a board has gotten into an incompletable state using various heuristics.
   * May return false positives, but must never return false negatives.
   */
  isValidPartial() {
    // Check if any paths have been isolated from their other halves
    // 1. Find the two unjoined tail ends of each current incomplete line
    // 2. Run A* to find a path between the tails. If no path, then invalid
  }
}
