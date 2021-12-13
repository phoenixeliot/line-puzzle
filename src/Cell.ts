import { Position, Board, EMPTY } from "./Board";

/*
Terminology:
Endpoint - The final cell of a line, generally given as the only filled cells in the start of a puzzle
Tail - The incomplete end of a line that hasn't connected to another endpoint yet. The other end is the starting endpoint.
Line segment - A cell connecting a tail and endpoint (or two endpoints, if it's completed)
Wall - An unusable cell on the board; an obstacle
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
      value: board
    });
  }

  isTail() {
    const numSameColorNeighbors = this.board.getSameColorNeighborCells(this.position).length;
    if (numSameColorNeighbors === 0) {
      return true;
    }
    if (this.board.getSameColorNeighborCells(this.position).length === 1 && !this.isEndpoint) {
      return true;
    }
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
