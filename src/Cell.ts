import { Position, Board } from "./Board";
import { COLORS, EMPTY } from "./contants";

/*
Terminology:
Endpoint - The final cell of a line, generally given as the only filled cells in the start of a puzzle
Tail - The incomplete end of a line that hasn't connected to another endpoint yet. The other end is the starting endpoint.
Line segment - A cell connecting a tail and endpoint (or two endpoints, if it's completed)
Wall - An unusable cell on the board; an obstacle
Active cell - One that can still make connections. Empty, or a tail.
*/

export class Cell {
  color: string;
  position: Position;
  isEndpoint: boolean;
  board: Board;

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
    const numSameColorNeighbors = this.board.getSameColorNeighborCells(this.position).length;
    return (
      // If it's a lone endpoint with no line segments attached
      numSameColorNeighbors === 0 ||
      // Or it's a line segment with only one connection
      (this.board.getSameColorNeighborCells(this.position).length === 1 && !this.isEndpoint)
    );
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
