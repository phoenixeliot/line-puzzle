import isEqual from "lodash/isEqual";
import { Area } from "./Area";
import { Cell } from "./Cell";
import { SerializedSet } from "./SerializedSet";
import { ENDPOINT_COLORS, WALL, COLORS, EMPTY } from "./contants";

export function getNextClockwiseDirection(direction, directions) {
  const index = directions.findIndex(isEqual.bind(null, direction));
  if (index === -1) {
    throw new Error("Invalid direction given from direction list");
  }
  return directions[(index + 1) % directions.length];
}

export function getClockwiseDirectionsStartingWith(direction, directions) {
  const startIndex = directions.findIndex(isEqual.bind(null, direction));
  if (startIndex === -1) {
    throw new Error("Invalid direction given from direction list");
  }
  return directions.slice(startIndex).concat(directions.slice(0, startIndex));
}

export interface Position {
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

  // Just create the object, we initialize it later so Cells can have a reference to the Board
  constructor() {}

  /**
   * Populate the board values after the board exists, so Cells can have a reference to the Board
   * @param {*} data - Grid cell data
   * @param {Rules} rules - Board rules (eg which cells are connected to others, eg grid vs hex)
   * @param {Object} options
   * @param {boolean} options.isInitial - True if the board is completely unsolved (only endpoints on lines)
   */
  init(data, rules: Rules) {
    this.data = data;
    this.rules = rules;
  }

  static fromString(boardString, rules: Rules) {
    const board = new Board();
    const boardData = boardString
      .trim()
      .split("\n")
      .map((row, y) =>
        row.split("").map((color, x) => {
          return new Cell({
            color: color.toUpperCase(),
            isEndpoint: ENDPOINT_COLORS.includes(color),
            position: { x, y },
            board,
          });
        })
      );
    board.init(boardData, rules);
    return board;
  }

  toString() {
    return this.data
      .map((row) =>
        row
          .map((cell) => (cell.isEndpoint ? cell.color.toUpperCase() : cell.color.toLowerCase()))
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
    return this.getNeighborCells(position).filter((neighbor) => neighbor.color === cell.color);
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
      if (cell.isTail()) {
        yield cell;
      }
    }
  }

  isComplete() {
    // Make sure all cells are filled
    if (
      !this.data.every((row, y) => row.every((cell, x) => (WALL + COLORS).includes(cell.color)))
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
            const sameColorNeighbors = this.getSameColorNeighborCells(cell.position);
            const numSameColorNeighbors = sameColorNeighbors.length;
            return numSameColorNeighbors;
          })
      );
      return isEqual(counts, new Set([1, 2])) || isEqual(counts, new Set([1]));
    });
  }

  getEmptyNeighborCells(position) {
    return this.getNeighborCells(position).filter((cell) => EMPTY.includes(cell.color));
  }

  /**
   * Returns true if there is an open-space path between two positions
   */
  canConnect(pos1: Position, pos2: Position) {
    // TODO Dedupe logic with Area flood-fill algorithm
    const cell1 = this.getCell(pos1);
    const filledPositions = new SerializedSet<Position>();
    const growingEdge = new SerializedSet<Position>([pos1]);
    while (growingEdge.size > 0) {
      for (const newPos of growingEdge) {
        if (isEqual(newPos, pos2)) {
          return true;
        }
        const unexploredNeighbors = this.getNeighborCells(newPos).filter((neighborCell) => {
          return (
            (EMPTY.includes(neighborCell.color) || neighborCell.color === cell1.color) &&
            !filledPositions.has(neighborCell.position) &&
            !growingEdge.has(neighborCell.position)
          );
        });
        unexploredNeighbors.forEach((cell) => growingEdge.add(cell.position));
        filledPositions.add(newPos);
        growingEdge.delete(newPos);
      }
    }
    return false;
  }

  getOpenAreas(): Array<Area> {
    // find the open areas
    const areas = [];
    const remainingPositions = new SerializedSet(
      Array.from(this.iterateCells()).map((cell) => cell.position)
    );
    while (remainingPositions.size > 0) {
      const cell = this.getCell(remainingPositions.getOne());
      // either:
      // cell is empty or a tail
      //   -> start an area there, explore it to completion
      console.log(cell);
      if (EMPTY.includes(cell.color) || cell.isTail()) {
        const area = Area.fromCell(cell);
        areas.push(area);
        for (const position of area.positions) {
          remainingPositions.delete(position);
        }
      } else {
        // cell is part of a wall or line segment
        //   -> ignore it, remove from remainingCells
        remainingPositions.delete(cell.position);
      }
    }
    return areas;
  }

  getEdgeColorOrdering(perimeter: Array<Position>): Array<string> {
    // given the list of edge cells, get the order of all colors on the edge
    return perimeter
      .map((pos) => this.getCell(pos).color)
      .filter((color) => COLORS.includes(color));
  }

  simplifyEdgeColorOrdering(colorOrdering: Array<string>): Array<string> {
    while (colorOrdering.length) {
      let madeChanges = false;
      for (let index = 0; index < colorOrdering.length; index++) {
        const currentColor = colorOrdering[index];
        const nextColor = colorOrdering[(index+1) % colorOrdering.length];
        if (colorOrdering.filter((color) => color === currentColor).length === 1) {
          colorOrdering.splice(index, 1);
          madeChanges = true;
          break;
        }
        if (currentColor == nextColor) {
          colorOrdering.splice(index, 2);
          madeChanges = true;
          break;
        }
      }
      if (!madeChanges) {
        break
      }
    }
    return colorOrdering;
  }

  /**
   * Checks whether a board has gotten into an incompletable state using various heuristics.
   * May return false positives, but must never return false negatives.
   */
  isValidPartial() {
    // Check if any paths have been isolated from their other halves
    // 1. Find the two unjoined tail ends of each current incomplete line
    const hasPathBetweenTails = Array.from(this.iterateTails()).every((tailCell1) => {
      const tailCell2 = Array.from(this.iterateTails()).find(
        (cell) => cell.color === tailCell1.color && cell !== tailCell1
      );
      // 2. Run A* to find a path between the tails. If no path, then invalid
      return this.canConnect(tailCell1.position, tailCell2.position);
    });
    if (!hasPathBetweenTails) return false;

    // Check for unresolvable tangles (eg endpoints on border that go RBRB around the perimeter)
    const simplifiedColorOrderings = this.getOpenAreas().map((area) =>
      this.simplifyEdgeColorOrdering(this.getEdgeColorOrdering(area.perimeter))
    );
    if (simplifiedColorOrderings.some((ordering) => ordering.length > 0)) {
      return false
    }

    return true;
  }

  solve(): Board {
    return this;
  }
}
