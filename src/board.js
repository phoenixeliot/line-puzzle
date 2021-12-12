export const WALL = "#";
export const COLORS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const EMPTY = "-";

export class Cell {
  constructor(color, position) {
    this.color = color;
    this.position = position;
  }
}

function setIsEqual(set, otherSet) {
  return (
    set.size === otherSet.size && [...set].every((value) => otherSet.has(value))
  );
}

export class Board {
  constructor(data, rules) {
    this.data = data;
    this.rules = rules;
  }

  static fromString(boardString, rules) {
    const boardData = boardString
      .trim()
      .split("\n")
      .map((row, y) =>
        row.split("").map((color, x) => {
          return new Cell(color, { x, y });
        })
      );
    return new Board(boardData, rules);
  }

  toString() {
    return this.data
      .map((row) => row.map((cell) => cell.color).join(""))
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

  getColors() {
    return new Set(
      this.data
        .flat()
        .map((cell) => cell.color)
        .filter((color) => COLORS.includes(color))
    );
  }

  *iterateCells() {
    for (const row of this.data) {
      for (const cell of row) {
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
            const neighborPositions = this.getNeighborPositions(cell.position);
            const neighbors = neighborPositions.map((pos) => this.getCell(pos));
            const sameColorNeighbors = neighbors.filter(
              (neighbor) => neighbor.color === cell.color
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
}

// export function getValidMoves(board, rules, position) {
//   const validDirections = rules.getValidDirections(board, rules, position);
//   return validDirections.map((direction) => {
//     return { x: position.x + direction.dx, y: position.y + direction.dy };
//   });
// }
