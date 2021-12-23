import isEqual from "lodash/isEqual";
import cloneDeep from "lodash/cloneDeep";
import cloneDeepWith from "lodash/cloneDeepWith";
import { Area } from "./Area";
import { Cell } from "./Cell";
import { SerializedSet } from "./SerializedSet";
import { ENDPOINT_COLORS, WALL, COLORS, EMPTY } from "./constants";
import { colorize } from "./terminalColors";

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
export interface PositionDelta {
  dx: number;
  dy: number;
}

export interface Rules {
  getNeighborDirections: (pos: Position) => Array<PositionDelta>;
}

export class Path extends Array<Position> {
  toString(board?: Board): string {
    const grid = [];
    // Fill in the background area
    const allBoardPositions = board
      ? Array.from(board.iterateCells()).map((c) => c.position)
      : this;
    const maxX = allBoardPositions.map((p) => p.x).reduce((a, b) => Math.max(a, b), 0);
    const maxY = allBoardPositions.map((p) => p.y).reduce((a, b) => Math.max(a, b), 0);
    for (let y = 0; y <= maxY; y++) {
      if (!grid[y]) {
        grid[y] = [];
      }
      for (let x = 0; x <= maxX; x++) {
        grid[y][x] = "-";
      }
    }
    // Fill in the path itself
    for (const position of this) {
      grid[position.y][position.x] = "@";
    }
    return grid.map((row) => row.join("")).join("\n");
  }
}

export class AreaColors {
  originalPerimeterColors: Array<string>;
  perimeterColors: Array<string>;
  innerColors?: Set<string>;
  lineColors?: Set<string>;

  constructor({
    perimeterColors,
    innerColors = new Set<string>(),
    lineColors = new Set<string>(),
  }) {
    this.originalPerimeterColors = Array.from(perimeterColors);
    this.perimeterColors = perimeterColors;
    this.innerColors = innerColors;
    this.lineColors = lineColors;
  }
}

export class Board {
  data: Array<Array<Cell>>;
  rules: Rules;
  dimensions: {
    width: number;
    height: number;
  };
  colors: Set<string>;
  consoleColorMap = {
    "-": ["dim"],
    "#": ["black", "whiteBg"],
    R: "red",
    G: "green",
    Y: "yellow",
    B: "blue",
    K: "magenta", // pink, closest console color
    C: "cyan",
    N: "greenBg", // brown, no console color
    O: "redBg", // orange, no console color
    P: "magentaBg", // purple, no console color
  };

  // Just create the object, we initialize it later so Cells can have a reference to the Board
  constructor(data?: Array<Array<Cell>>, rules?: Rules) {
    if (data && rules) {
      const newData = cloneDeepWith(data, (value) => {
        if (value.constructor == Board) {
          return null;
        }
      });
      this.init(newData, rules);
      for (const cell of this.iterateCells()) {
        cell.board = this;
      }
    }
  }

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
    this.dimensions = this._getDimensions();
    this.colors = this._getColors();
  }

  clone() {
    return new Board(this.data, this.rules);
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

  toString(useColors = false) {
    return this.data
      .map((row) =>
        row
          .map((cell) => {
            const cellText = cell.isEndpoint
              ? cell.color.toUpperCase()
              : cell.color.toLowerCase();
            if (useColors) {
              return colorize(cellText, this.consoleColorMap[cell.color]);
            } else {
              return cellText;
            }
          })
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

  getColor(position: Position) {
    return this.getCell(position).color;
  }

  setColor(position: Position, color: string) {
    this.getCell(position).color = color;
  }

  // TODO: Refactor once I have connections embedded in the data
  getConnections(position: Position): Array<Position> {
    const cell = this.getCell(position);
    if (!cell.hasLine()) return []; // For walls, etc
    return this.getNeighborCells(position)
      .filter((neighborCell) => {
        return neighborCell.hasLine() && neighborCell.color == cell.color;
      })
      .map((c) => c.position);
  }

  pushColor(position: Position, color: string, avoidColors: Array<string> = []): boolean {
    const cell = this.getCell(position);
    if (cell.isEndpoint) return cell.color === color;
    const connections = this.getConnections(position);
    this.setColor(position, color);
    console.log("===============");
    console.log(this.toString());
    debugger;
    // console.log(connections);
    if (connections.length == 2) {
      this.connectPathWithPushing(
        connections[0],
        connections[1],
        this.getCell(connections[0]).color,
        avoidColors.concat([color])
      );
    }
    return true;
  }

  connectPathWithPushing(pos1, pos2, color, avoidColors = []): boolean {
    if (this.getCell(pos1).color !== color) {
      return false;
    }
    const allowOtherColorCollisionRules = {
      // fn: get positions I can move to in 1 step from this position
      getNextMoves: (path) => {
        const pos = path.at(-1);
        const candidatePositions = this.getNeighborPositions(pos);
        const newPositions = candidatePositions.filter((newPos) => {
          const cell = this.getCell(newPos);
          // if (isEqual(pos, { x: 4, y: 3 })) debugger;
          return (
            this.isValidPosition(newPos) &&
            // !isEqual(pos, path.at(-2)) &&
            !path.some((prevPos) => isEqual(newPos, prevPos)) &&
            // Don't path through the currently pushing path, except to finish connecting
            (cell.color !== color || cell.isTail()) &&
            // Don't push through immovable cells
            !(cell.color !== color && cell.isEndpoint) &&
            !avoidColors.includes(cell.color)
          );
        });
        return newPositions.map((newPos) => {
          return path.concat([newPos]);
        });
      },
      // fn: partial solution quality heuristic (what properties must it have to guarantee optimality, again?)
      // Smaller is better
      partialQualityHeuristic: (path) => {
        const pos = path.at(-1);
        const euclideanDistanceRemaining =
          Math.abs(pos.x - pos2.x) + Math.abs(pos.y - pos2.y);
        return path.length + euclideanDistanceRemaining;
      },
    };
    // debugger;
    const path = this.findPath(pos1, pos2, allowOtherColorCollisionRules);
    if (!path) return false; // No path was found
    for (const pos of path) {
      const cell = this.getCell(pos);
      if (cell.color === color) continue; // Skip if it's already colored correctly
      this.pushColor(pos, color, avoidColors.concat([color]));
    }
    return true;
  }

  connectPathToPosition(pos1, pos2, color): boolean {
    if (this.getCell(pos1).color !== color) {
      return false;
    }
    const noCollisionSearchRules = {
      // fn: get positions I can move to in 1 step from this position
      getNextMoves: (path) => {
        const pos = path.at(-1);
        const candidatePositions = this.getNeighborPositions(pos);
        const newPositions = candidatePositions.filter((pos) => {
          const cell = this.getCell(pos);
          return (
            this.isValidPosition(pos) &&
            // !isEqual(pos, path.at(-2)) &&
            !path.some((prevPos) => isEqual(pos, prevPos)) &&
            (cell.isEmpty() || (cell.isTail() && cell.color === this.getCell(pos1).color))
          );
        });
        return newPositions.map((newPos) => {
          return path.concat([newPos]);
        });
      },
      // fn: partial solution quality heuristic (what properties must it have to guarantee optimality, again?)
      // Smaller is better
      partialQualityHeuristic: (path) => {
        const pos = path.at(-1);
        const euclideanDistanceRemaining =
          Math.abs(pos.x - pos2.x) + Math.abs(pos.y - pos2.y);
        return path.length + euclideanDistanceRemaining;
      },
      allowBacktracking: true,
    };
    const path = this.findPath(pos1, pos2, noCollisionSearchRules);
    if (!path) return false; // No path was found
    for (const pos of path) {
      this.setColor(pos, color);
    }
    return true;
  }

  // TODO: Implement highly generic/configurable A*
  findPath(pos1, pos2, rules): Path {
    // debugger;
    const paths: Array<Path> = [[pos1]];
    if (rules.allowBacktracking) {
      // TODO: Get the current already-existing path on each end
      // and include backtracks of those paths in the path list.
      // May require refactoring to allow searching from both ends??
    }
    while (true) {
      // Sort backwards so we can pop cheaply. Best paths are at the end.
      paths.sort(
        (a, b) => -(rules.partialQualityHeuristic(a) - rules.partialQualityHeuristic(b))
      );
      console.log("===============");
      for (const path of paths) {
        console.log(
          rules.partialQualityHeuristic(path),
          path.map((p) => JSON.stringify(p)).join("\n")
        );
      }
      // debugger;
      const path = paths.pop();

      // Check finish conditions
      if (!path) return null; // We've run out of paths to try
      if (isEqual(path.at(-1), pos2)) return Path.from(path); // We've found the exit

      // Add the new frontier of paths
      // TODO: Consider using a Map to make each cell have only one best path, no multiple paths going through the same cell
      const newPaths = rules.getNextMoves(path);
      for (const newPath of newPaths) {
        paths.push(newPath);
      }
    }
  }

  getCell(position: Position) {
    let cell = null;
    try {
      cell = this.data[position.y][position.x];
    } catch (e) {}
    if (!cell) throw Error(`No cell found at position ${JSON.stringify(position)}`);
    return cell;
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

  _getColors() {
    return new Set(
      this.data
        .flat()
        .map((cell) => cell.color)
        .filter((color) => COLORS.includes(color))
    );
  }

  _getDimensions() {
    let width = 0;
    let height = 0;
    for (const cell of this.iterateCells()) {
      if (cell.position.x + 1 > width) {
        width = cell.position.x + 1;
      }
      if (cell.position.y + 1 > height) {
        height = cell.position.y + 1;
      }
    }
    return { width, height };
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
      !this.data.every((row, y) =>
        row.every((cell, x) => (WALL + COLORS).includes(cell.color))
      )
    ) {
      return false;
    }
    // There should be no loose tails
    if (Array.from(this.iterateTails()).length > 0) {
      return false;
    }
    // Make sure every color has a path along itself to all other cells of that color
    return Array.from(this.colors).every((color) => {
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
      // TODO: Revise or cut after adding 'no loose tails' check above which might be equivalent to the intent here
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
    // TODO: Use A* search instead of flood-fill (which is basically BFS)
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

  getOpenAreas(): Array<Area> {
    // find the open areas
    const areas = [];
    const remainingPositions = new SerializedSet(
      Array.from(this.iterateCells()).map((cell) => cell.position)
    );
    // First loop through all empty spaces
    // THEN loop through all other spaces (which should be fully surrounded singlets only)
    for (const filterFn of [(pos) => this.getCell(pos).isEmpty(), (pos) => true]) {
      while (new Set(remainingPositions.filter(filterFn)).size > 0) {
        const cell = this.getCell(remainingPositions.getOne(filterFn));
        // either:
        // cell is empty or a tail
        //   -> start an area there, explore it to completion
        if (cell.isActive()) {
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
    }
    return areas;
  }

  getEdgeColorOrdering(perimeter: Array<Position>): Array<string> {
    // given the list of edge cells, get the order of all colors on the edge
    return perimeter
      .map((pos) => this.getCell(pos).color)
      .filter((color) => COLORS.includes(color));
  }

  getAreaColors(area: Area) {
    return new AreaColors({
      perimeterColors: this.getEdgeColorOrdering(area.perimeter),
      innerColors: area.getInnerColors(this),
    });
  }

  // TODO: Move with getAreaColors into Area class or so
  simplifyEdgeColorOrderings(colorOrderings: Array<AreaColors>): Array<AreaColors> {
    const simplifiedOrderings: Array<AreaColors> = cloneDeep(colorOrderings);
    const resolvedColors = new Set();
    // First, simplify each ordering independently
    // while (simplifiedOrderings.some((areaColors) => areaColors.perimeterColors.length)) {
    while (true) {
      let madeChanges = false;
      for (const areaColors of simplifiedOrderings) {
        const colorOrdering = areaColors.perimeterColors;
        for (let index = 0; index < colorOrdering.length; index++) {
          const currentColor = colorOrdering[index];
          const nextColor = colorOrdering[(index + 1) % colorOrdering.length];
          if (
            colorOrdering.filter((color) => color === currentColor).length === 1 &&
            // simplifiedOrderings.filter((areaColors) =>
            //   areaColors.perimeterColors.includes(currentColor)
            // ).length === 1 &&
            areaColors.innerColors.has(currentColor)
          ) {
            resolvedColors.add(currentColor);
            areaColors.lineColors.add(currentColor);
            colorOrdering.splice(index, 1);
            madeChanges = true;
            break;
          }
          if (colorOrdering.length > 1 && currentColor == nextColor) {
            resolvedColors.add(currentColor);
            areaColors.lineColors.add(currentColor);
            colorOrdering.splice(index, 2);
            madeChanges = true;
            break;
          }
        }
      }
      // Then, remove resolved colors from all other orderings and re-simplify
      for (const areaColors of simplifiedOrderings) {
        const colorOrdering = areaColors.perimeterColors;
        const filtered = colorOrdering.filter((color) => !resolvedColors.has(color));
        if (filtered.length < colorOrdering.length) {
          madeChanges = true;
          areaColors.perimeterColors = filtered;
        }
      }
      // If we haven't made any changes this iteration, it can't be simplified further
      if (!madeChanges) {
        break;
      }
    }

    return simplifiedOrderings;
  }

  /**
   * Checks whether a board has gotten into an incompletable state using various heuristics.
   * May return false positives, but must never return false negatives.
   */
  isValidPartial() {
    const tails = Array.from(this.iterateTails());
    // If we have uneven number of tails, one has self-closed
    // TODO: Clean this up with better logic
    for (const color of this.colors) {
      const tailsOfThisColor = tails.filter((cell) => cell.color === color);
      if (tailsOfThisColor.length % 2 !== 0) {
        return false;
      }
    }

    // Check if any paths have been isolated from their other halves
    // 1. Find the two unjoined tail ends of each current incomplete line
    const hasPathBetweenTails = tails.every((tailCell1) => {
      const tailCell2 = tails.find(
        (cell) => cell.color === tailCell1.color && cell !== tailCell1
      );
      if (!tailCell2) return false;
      // 2. Run A* to find a path between the tails. If no path, then invalid
      return this.canConnect(tailCell1.position, tailCell2.position);
    });
    if (!hasPathBetweenTails) return false;

    // Check for unresolvable tangles (eg endpoints on border that go RBRB around the perimeter)
    const areas = this.getOpenAreas();
    const areaColorSets = areas.map((area) => {
      return this.getAreaColors(area);
    });
    const simplifiedColorOrderings = this.simplifyEdgeColorOrderings(areaColorSets);
    if (
      simplifiedColorOrderings.some(
        (ordering) =>
          ordering.perimeterColors.length > 0 || ordering.lineColors.size === 0
      )
    ) {
      return false;
    }

    // const simplifiedColorOrderings = colorOrderings.map((ordering) => {
    //   const simplifiedOrdering = this.simplifyEdgeColorOrdering(ordering, colorOrderings);
    //   return { ordering, simplifiedOrdering };
    // });
    // If a color is involved in a knot in one area, but knotless in another area, remove it from knotted areas
    // TODO: Put this in another function? probably in simplifyEdgeColorOrdering
    // TODO: Do this until everything is resolved
    // for (const { ordering, simplifiedOrdering } of simplifiedColorOrderings) {
    //   if (simplifiedColorOrderings.length > 0) {
    //     for (const { simplifiedOrdering: simplifiedOrdering2 } of simplifiedColorOrderings) {
    //       delete
    //     }
    //   }
    // }

    // Check for inaccessible areas (no tails reachable to fill the space)
    if (areas.some((area) => !area.positions.some((pos) => this.getCell(pos).isTail()))) {
      return false;
    }

    return true;
  }

  getValidMovesFrom(position) {
    // Get all adjacent moves and run those board states against isValidPartial
    const cell = this.getCell(position);
    const directions = this.rules.getNeighborDirections(position);
    return directions
      .filter((direction) => {
        const newPosition = {
          x: position.x + direction.dx,
          y: position.y + direction.dy,
        };
        if (!this.isValidPosition(newPosition)) return false;
        if (!this.getCell(newPosition).isEmpty()) return false;
        const hypotheticalBoard = new Board(this.data, this.rules);
        hypotheticalBoard.setColor(newPosition, cell.color);
        if (!hypotheticalBoard.isValidPartial()) return false;
        return true;
      })
      .map((direction) => {
        return {
          direction,
          position: { x: position.x + direction.dx, y: position.y + direction.dy },
        };
      });
  }

  async solve() {
    const { board } = await this._solve();
    return board;
  }

  // TODO fix this any type
  async _solve(
    copy = true,
    recursionAttempts = 0
  ): Promise<{ board; isComplete; recursionAttempts }> {
    // if (level > 3) {
    //   return this;
    // }
    console.log(this.toString());
    // if (recursionAttempts >= 1) {
    //   return { board: this, isComplete: this.isComplete(), recursionAttempts };
    // }
    // console.log({ recursionAttempts });
    // If board is ever not isValidPartial(), cancel the current search branch

    // const workingBoard = new Board(this.data, this.rules);
    this.solveChoicelessMoves();

    if (this.isComplete()) {
      return {
        board: this,
        isComplete: true,
        recursionAttempts,
      };
    }

    console.log(this.toString());
    // return [this, recursionAttempts];

    // When ambiguous, use A*
    // Heuristics:
    // - TODO Move along the perimeter if touching the inactive edge
    // - TODO Move toward the same color tail
    for (const tail of this.iterateTails()) {
      for (const emptyCell of tail.getNeighbors().filter((n) => n.isEmpty())) {
        const hypothesisBoard = new Board(this.data, this.rules);
        hypothesisBoard.setColor(emptyCell.position, tail.color);
        // console.log(`at depth ${level}:\n${hypothesisBoard.toString()}`);

        const {
          board,
          isComplete,
          recursionAttempts: newRecursionAttempts,
        } = await hypothesisBoard._solve(false, recursionAttempts); // don't re-duplicate since we just duplicated
        recursionAttempts = recursionAttempts + newRecursionAttempts;
        console.log({ recursionAttempts });
        if (isComplete || recursionAttempts > 3) {
          console.log(`Success after ${recursionAttempts} recursions`);
          return { board, isComplete, recursionAttempts };
        }
      }
    }

    // TODO: Try out my "known good visual patterns" heuristic idea
    return {
      board: this,
      isComplete: false,
      recursionAttempts,
    };
  }

  // TODO: Make an animation out of this
  // TODO: Maybe convert to React while I'm at it to use time travel features
  async solveChoicelessMoves(): Promise<Board> {
    // First, find moves that must be done
    // Types:
    // - Tail has only one empty cell next to it
    // - Move would make a space inaccessible (handled by isValidPartial)
    // - TODO Move along the perimeter if two of same color tail are adjacent
    let madeChanges = true;
    while (madeChanges) {
      console.log(this.toString());
      madeChanges = false;
      for (const tail of this.iterateTails()) {
        const neighbors = tail.getNeighbors();
        const emptyNeighbors = neighbors.filter((neighbor) => neighbor.isEmpty());
        if (emptyNeighbors.length === 1) {
          const emptyNeighbor = emptyNeighbors[0];
          this.setColor(emptyNeighbor.position, tail.color);
          madeChanges = true;
          break; // Regenerate the list of tails
        }
        const validMoves = this.getValidMovesFrom(tail.position);
        if (validMoves.length === 1) {
          const movePosition = validMoves[0].position;
          this.setColor(movePosition, tail.color);
          madeChanges = true;
          break;
        }
      }
    }
    return this;
  }
}
