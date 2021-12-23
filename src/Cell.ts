import { Position, Board } from "./Board";
import { COLORS, EMPTY, WALL } from "./constants";

/*
Terminology:
Endpoint - The final cell of a line, generally given as the only filled cells in the start of a puzzle
Tail - The incomplete end of a line that hasn't connected to another endpoint yet. The other end is the starting endpoint.
Line segment - A cell connecting a tail and endpoint (or two endpoints, if it's completed)
Wall - An unusable cell on the board; an obstacle
Active cell - One that can still make connections. Empty, or a tail.
*/

export enum CellType {
  EMPTY = "EMPTY",
  WALL = "WALL",
  LINE_SEGMENT = "LINE_SEGMENT",
  ENDPOINT = "ENDPOINT",
  UNKNOWN = "UNKNOWN",
}

export class Cell {
  color: string;
  position: Position;
  isEndpoint: boolean;
  board: Board;
  type: CellType;

  constructor({ color, position, isEndpoint, board }) {
    this.color = color;
    this.position = position;
    this.isEndpoint = isEndpoint;

    // Set Board separately so it doesn't get enumerated by toJSON
    Object.defineProperty(this, "board", {
      enumerable: false,
      writable: true,
      value: board,
    });
  }

  isTail() {
    if (!COLORS.includes(this.color)) {
      return false;
    }
    const numSameColorNeighbors = this.board.getSameColorNeighborCells(
      this.position
    ).length;
    return (
      // If it's a lone endpoint with no line segments attached
      numSameColorNeighbors === 0 ||
      // Or it's a line segment with only one connection
      (this.board.getSameColorNeighborCells(this.position).length === 1 &&
        !this.isEndpoint)
    );
  }

  getType() {
    if (this.isEmpty()) {
      return CellType.EMPTY;
    } else if (this.isWall()) {
      return CellType.WALL;
    } else if (this.isEndpoint) {
      return CellType.ENDPOINT;
    } else if (this.hasLine()) {
      return CellType.LINE_SEGMENT;
    } else {
      return CellType.UNKNOWN;
    }
  }

  hasLine() {
    return COLORS.includes(this.color);
  }

  isKnownType() {
    return [...COLORS, ...WALL, ...EMPTY].includes(this.color);
  }

  isEmpty() {
    return EMPTY.includes(this.color);
  }

  isWall() {
    return WALL.includes(this.color);
  }

  getNeighbors() {
    // TODO: Move this completely in here
    return this.board.getNeighborCells(this.position);
  }

  /**
   * I may need to rename this. "Active" means cell is either a tail or empty; it can still be connected to by neighboring cells.
   */
  isActive() {
    return this.isTail() || EMPTY.includes(this.color);
  }
}
