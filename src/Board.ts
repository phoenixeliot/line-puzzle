import { isEqual } from "lodash";

export const WALL = "#";
export const ENDPOINT_COLORS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const PATH_COLORS = "abcdefghijklmnopqrstuvwxyz";
export const COLORS = ENDPOINT_COLORS + PATH_COLORS;
export const EMPTY = "-";

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
      value: board,
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

/**
 * Represents an open area of a board, including empty spaces and tails, but not including walls or line segments
 */
export class Area {
  // TODO: Clean up any of these I don't actually need/use
  cells: Array<Position>;
  perimeter: Array<Position>; // Clockwise ordered cells marking the outer edge of the area

  constructor({ cells, perimeter }) {
    this.cells = cells;
    this.perimeter = perimeter;
  }

  static fromCell(cell: Cell) {
    const board = cell.board;
    if (!cell.isActive()) {
      throw Error("Invalid starting cell for finding an area (cell is not active)" + JSON.stringify(cell));
    }

    // Flood-fill algorithm
    const filledPositions = new SerializedSet<Position>();
    const growingEdge = new SerializedSet<Position>([cell.position]);
    while (growingEdge.size > 0) {
      for (const newPos of growingEdge) {
        const unexploredNeighbors = cell.board.getNeighborCells(newPos).filter((neighborCell) => {
          return (
            neighborCell.isActive() &&
            !filledPositions.has(neighborCell.position) &&
            !growingEdge.has(neighborCell.position)
          );
        });
        unexploredNeighbors.forEach((cell) => growingEdge.add(cell.position));
        filledPositions.add(newPos);
        growingEdge.delete(newPos);
      }
    }

    // Get the perimeter from the filled area (all cells that aren't surrounded by other cells in the area)
    const unorderedPerimeter = new SerializedSet(
      Array.from(filledPositions).filter((position) => {
        return !cell.board.getNeighborCells(position).every((neighbor) => {
          filledPositions.has(neighbor.position);
        });
      })
    );

    const perimeterStart = unorderedPerimeter.getOne();
    let nextNeighbor;
    let nextStartDirection;
    {
      // The clockwise oriented one is the one that, if you turn one more step clockwise,
      // you run into something in the body, or the other perimeter connection
      const neighbors = board.getNeighborPositions(perimeterStart);
      const neighborPerimeterCells = neighbors.filter((neighbor) => unorderedPerimeter.has(neighbor));
      if (neighborPerimeterCells.length !== 2) throw new Error("Something went wrong in perimeter calculation");

      const [firstNeighbor, secondNeighbor] = neighborPerimeterCells;
      const directionToNeighbor = {
        dx: firstNeighbor.x - perimeterStart.x,
        dy: firstNeighbor.y - perimeterStart.y,
      };

      const directions = board.rules.getNeighborDirections(firstNeighbor);
      const directionIndex = directions.findIndex((d) => isEqual(d, directionToNeighbor));
      const nextClockwiseDirection = directions[directionIndex % directions.length];

      const positionInNextClockwiseDirection = {
        x: perimeterStart.x + nextClockwiseDirection.dx,
        y: perimeterStart.y + nextClockwiseDirection.dy,
      };
      if (filledPositions.has(positionInNextClockwiseDirection)) {
        nextNeighbor = firstNeighbor;
      } else {
        nextNeighbor = secondNeighbor;
      }
      // TODO: Extract into function to get next clockwise direction
      nextStartDirection = getNextClockwiseDirection(
        {
          // 1 CW turn from facing directly back the way we just came, then search CW from there each time
          dx: perimeterStart.x - nextNeighbor.x,
          dy: perimeterStart.y - nextNeighbor.y,
        },
        directions
      );
    }

    // Gather every perimeter position into a clockwise ordered list
    const clockwisePerimeter = [perimeterStart, nextNeighbor];
    while (true) {
      let foundNext = false;
      const rotatedDirections = getClockwiseDirectionsStartingWith(
        nextStartDirection,
        board.rules.getNeighborDirections(nextNeighbor)
      );
      for (const direction of rotatedDirections) {
        const newPos = {
          x: nextNeighbor.x + direction.dx,
          y: nextNeighbor.y + direction.dy,
        };
        if (unorderedPerimeter.has(newPos)) {
          nextNeighbor = newPos;
          // 1 CW turn from facing directly back the way we just came, then search CW from there each time
          nextStartDirection = getNextClockwiseDirection({ dx: -direction.dx, dy: -direction.dy }, rotatedDirections);
          foundNext = true;
          break;
        }
      }
      if (!foundNext) {
        throw new Error("Didn't find next item on perimeter path — this should not happen.")
      }
      if (isEqual(nextNeighbor, perimeterStart)) {
        break;
      }
      clockwisePerimeter.push(nextNeighbor);
    }

    return new Area({
      cells: filledPositions,
      perimeter: clockwisePerimeter,
    });
  }
}

export class SerializedSet<T> extends Set {
  constructor(items: Array<T> = []) {
    super(items);
  }
  has(item: T) {
    return super.has(JSON.stringify(item));
  }
  /**
   * get a random single item from the set
   */
  getOne(): T {
    if (this.size === 0) {
      throw Error("Can't getOne from empty SerializedSet");
    }
    return this.values().next().value as T;
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
  }
  forEach(fn) {
    return super.forEach((item) => {
      fn(JSON.parse(item));
    });
  }
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
      .map((row) => row.map((cell) => (cell.isEndpoint ? cell.color.toUpperCase() : cell.color.toLowerCase())).join(""))
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
    if (!this.data.every((row, y) => row.every((cell, x) => (WALL + COLORS).includes(cell.color)))) {
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

  getOpenAreas(): Array<Array<Position>> {
    // find the open areas
    const areas = [];
    const remainingCells = new SerializedSet(Array.from(this.iterateCells()));
    while (remainingCells.size > 0) {
      remainingCells.forEach((cell) => {
        // either:
        // 1. cell is empty or a tail
        //   -> start an area there, explore it to completion
        if (WALL.includes(cell.color) || cell.isTail()) {
        }
        // 2. cell is part of a wall
        //   -> ignore it, remove from remainingCells
        // 3. cell is part of a line segment
        //   -> ignore it, remove from remainingCells
      });
    }
    return areas;
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
      return this.canConnect(tailCell1.position, tailCell2.position);
    });
    // 2. Run A* to find a path between the tails. If no path, then invalid
  }
}
