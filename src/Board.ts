import { isEqual } from "lodash";

export const WALL = "#";
export const ENDPOINT_COLORS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const PATH_COLORS = "abcdefghijklmnopqrstuvwxyz";
export const COLORS = ENDPOINT_COLORS + PATH_COLORS;
export const EMPTY = "-";

export class Cell {
  color: string;
  position: Position;
  isEndpoint: boolean;
  board: Board;

  constructor({ color, position, isEndpoint, board }) {
    this.color = color;
    this.position = position;
    this.isEndpoint = isEndpoint;
    this.board = board;
  }

  isTail(cell: Cell) {
    const numSameColorNeighbors = this.board.getSameColorNeighborCells(
      cell.position
    ).length;
    if (numSameColorNeighbors === 0) {
      yield cell;
    }
    if (
      this.board.getSameColorNeighborCells(cell.position).length === 1 &&
      !cell.isEndpoint
    ) {
      yield cell;
    }
  }
}

export class SerializedSet<T> extends Set {
  constructor(items: Array<T> = []) {
    super(items);
  }
  has(item: T) {
    return super.has(JSON.stringify(item));
  }
  add(item: T) {
    return super.add(JSON.stringify(item));
  }
  delete(item: T) {
    return super.delete(JSON.stringify(item));
  }
  [Symbol.iterator]() {
    return this.values();
  }
  *values(): Generator<T, void, unknown> {
    for (const item of super.values()) {
      yield JSON.parse(item);
    }
    // return Array.from(super.values()).map((item) => JSON.parse(item));
  }
  forEach(fn) {
    return super.forEach((item) => {
      fn(JSON.parse(item));
    });
  }
}

function setIsEqual(set, otherSet) {
  return (
    set.size === otherSet.size && [...set].every((value) => otherSet.has(value))
  );
}

interface Position {
  x: number;
  y: number;
}
interface PositionDelta {
  dx: number;
  dy: number;
}

export interface Rules {
  getNeighborDirections: (pos: Position) => Array<PositionDelta>;
}

export class Board {
  data: Array<Array<Cell>>;
  rules: Rules;

  /**
   *
   * @param {*} data - Grid cell data
   * @param {Rules} rules - Board rules (eg which cells are connected to others, eg grid vs hex)
   * @param {Object} options
   * @param {boolean} options.isInitial - True if the board is completely unsolved (only endpoints on lines)
   */
  constructor(data, rules: Rules) {
    this.data = data;
    this.rules = rules;
  }

  static fromString(boardString, rules: Rules) {
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
      .map((row) =>
        row
          .map((cell) =>
            cell.isEndpoint
              ? cell.color.toUpperCase()
              : cell.color.toLowerCase()
          )
          .join("")
      )
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

  getCell(position: Position) {
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

  getSameColorNeighborCells(position: Position) {
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
   * Finds all the loose tails of current lines
   * Will return starter cell if it has no line yet
   */
  *iterateTails() {
    for (const cell of this.iterateFilledCells()) {
      const numSameColorNeighbors = this.getSameColorNeighborCells(
        cell.position
      ).length;
      if (numSameColorNeighbors === 0) {
        yield cell;
      }
      if (
        this.getSameColorNeighborCells(cell.position).length === 1 &&
        !cell.isEndpoint
      ) {
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
      return isEqual(counts, new Set([1, 2])) || isEqual(counts, new Set([1]));
    });
  }

  getEmptyNeighborCells(position) {
    return this.getNeighborCells(position).filter((cell) =>
      EMPTY.includes(cell.color)
    );
  }

  /**
   * Returns true if there is an open-space path between two positions
   */
  canConnect(pos1: Position, pos2: Position) {
    const cell1 = this.getCell(pos1);
    const filledPositions = new SerializedSet<Position>();
    const growingEdge = new SerializedSet<Position>([pos1]);
    while (growingEdge.size > 0) {
      for (const newPos of growingEdge) {
        if (isEqual(newPos, pos2)) {
          return true;
        }
        const unexploredNeighbors = this.getNeighborCells(newPos).filter(
          (neighborCell) => {
            return (
              (EMPTY.includes(neighborCell.color) ||
                neighborCell.color === cell1.color) &&
              !filledPositions.has(neighborCell.position) &&
              !growingEdge.has(neighborCell.position)
            );
          }
        );
        unexploredNeighbors.forEach((cell) => growingEdge.add(cell.position));
        filledPositions.add(newPos);
        growingEdge.delete(newPos);
      }
    }
    return false;
  }

  getOpenAreas(): Array<Array<Position>> {
    // find the open areas
    const areas = [];
    const remainingCells = new SerializedSet(Array.from(this.iterateCells()));
    while (remainingCells.size > 0) {
      remainingCells.forEach((cell) => {
        // either:
        // 1. cell is empty or a tail
        //   -> start an area there, explore it to completion
        if (WALL.includes(cell.color) || this.isTail(position))
        // 2. cell is part of a wall
        //   -> ignore it, remove from remainingCells
        // 3. cell is part of a line segment
        //   -> ignore it, remove from remainingCells
      })
    }
    return areas
  }

  getEdgeColorOrdering(startPos: Position) {
    // identify the open spaces
    // for each open space, find an edge cell (space next to a line, or tail of a line, or a start cell)
    // with an edge cell, trace the edge using clockwise moves and record all of those cells
    // given the list of edge cells, get the order of all colored
  }

  /**
   * Checks whether a board has gotten into an incompletable state using various heuristics.
   * May return false positives, but must never return false negatives.
   */
  isValidPartial() {
    // Check if any paths have been isolated from their other halves
    // 1. Find the two unjoined tail ends of each current incomplete line
    return Array.from(this.iterateTails()).every((tailCell1) => {
      const tailCell2 = Array.from(this.iterateTails()).find(
        (cell) => cell.color === tailCell1.color && cell !== tailCell1
      );
      debugger;
      return this.canConnect(tailCell1.position, tailCell2.position);
    });
    // 2. Run A* to find a path between the tails. If no path, then invalid
  }
}
