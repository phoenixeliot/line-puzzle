import {
  makeAutoObservable,
  makeObservable,
  observable,
  computed,
  flow,
  action,
  autorun,
} from "mobx";
import isEqual from "lodash/isEqual";
import isEqualWith from "lodash/isEqualWith";
import cloneDeep from "lodash/cloneDeep";
import cloneDeepWith from "lodash/cloneDeepWith";
import { Area } from "./Area";
import { Cell } from "./Cell";
import { SerializedSet } from "./SerializedSet";
import { ENDPOINT_COLORS, WALL, COLORS, EMPTY } from "./constants";
import { colorize } from "./terminalColors";
import gridRules from "./gridRules";

const isEqualObj = (value, other) => {
  return isEqualWith(value, other, (v, o) => {
    if (v.isEqual && v.isEqual(o)) return true;
    if (o.isEqual && o.isEqual(v)) return true;
  });
};

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

export class Position extends Object {
  x: number;
  y: number;
  constructor(obj: { x: number; y: number }) {
    super();
    const { x, y } = obj;
    Object.assign(this, { x, y });
  }
  toString() {
    return `${this.x},${this.y}`;
  }
  static fromString(cellId): Position {
    const [x, y] = cellId.split(",").map(Number);
    if (x == null || y == null) {
      throw new Error(`Position was created with invalid coordinates: "${cellId}"`);
    }
    return new Position({ x, y });
  }
  static min(a, b) {
    if (a.x < b.x) return a;
    if (a.x > b.x) return b;
    if (a.y < b.y) return a;
    if (a.y > b.y) return b;
    return a;
  }
  isEqual(other) {
    return isEqual(Object.assign({}, this), Object.assign({}, other));
  }
}

export interface PositionDelta {
  dx: number;
  dy: number;
}

export function createEdgeIdFromPositions(
  pos1: Position,
  pos2: Position
): EdgeIdentifier {
  if (Position.min(pos1, pos2) === pos2) {
    // Swap so the lesser-sorted Position is first, so identifiers are unique
    [pos1, pos2] = [pos2, pos1];
  }
  return `${new Position(pos1).toString()};${new Position(pos2).toString()}`;
}

export interface Rules {
  getNeighborDirections: (pos: Position) => Array<PositionDelta>;
}

export class Path extends Array<Position> {
  // TODO: makeAutoObservable(this)?
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
    makeAutoObservable(this);
    this.originalPerimeterColors = Array.from(perimeterColors);
    this.perimeterColors = perimeterColors;
    this.innerColors = innerColors;
    this.lineColors = lineColors;
  }
}

type CellIdentifier = string; // point coordinates, eg "1,1"

type EdgeIdentifier = string; // pointA-pointB; eg "1,1-1,2"
class Edge {
  possible: boolean;
  connected: boolean;
}

type CellsCollection = Record<CellIdentifier, Cell>;

type EdgesCollection = Record<EdgeIdentifier, Edge>;

export class Board {
  cells: CellsCollection;
  edges: EdgesCollection; // Connections between adjacent cells
  rules: Rules = gridRules;
  dimensions: {
    width: number;
    height: number;
  } = { width: 0, height: 0 };
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

  /**
   * @param {*} data - Grid cell data
   * @param {Rules} rules - Board rules (eg which cells are connected to others, eg grid vs hex)
   */
  constructor(
    cells?: CellsCollection,
    edges?: EdgesCollection,
    rules: Rules = gridRules
  ) {
    this.cells = cells || {};
    this.edges = edges || {};
    this.rules = rules;
    this.dimensions = this._getDimensions();
    this.colors = this._getColors();
    makeObservable(this, {
      cells: observable,
      edges: observable,
      rules: observable,
      dimensions: observable,
      connectPathToPosition: action,
      connectPathWithPushing: action,
      setColor: action,
      pushColor: action,
      solve: action,
      _solve: action,
      solveChoicelessMoves: action,
      propagateEdgeConstraints: action,
    });
    // autorun(() => console.log(this.toString()));
  }

  clone() {
    return new Board(this.cells, this.edges, this.rules);
  }

  static fromString(boardString, rules: Rules = gridRules) {
    const cells: CellsCollection = {};
    boardString
      .trim()
      .split("\n")
      .forEach((row, y) =>
        row.split("").forEach((color, x) => {
          const cell = new Cell({
            color: color.toUpperCase(),
            isEndpoint: ENDPOINT_COLORS.includes(color),
            position: new Position({ x, y }),
          });
          cells[cell.position.toString()] = cell;
        })
      );
    const edges: EdgesCollection = {};
    const board = new Board(cells, edges, rules);

    Object.values(cells).forEach((cell1: Cell) => {
      const pos1 = cell1.position;
      board.getNeighborCells(cell1.position).forEach((cell2: Cell) => {
        const pos2 = cell2.position;
        const edgeId = createEdgeIdFromPositions(pos1, pos2);
        if (!edges[edgeId]) {
          const connected = cell1.hasLine && cell2.hasLine && cell1.color === cell2.color;

          // Not a complete set of when an edge is possible, but it's a start. TODO: Maybe just defer this entirely if we have to do it again later anyway?
          const possible =
            connected ||
            (!cell1.isWall &&
              !cell2.isWall &&
              !(cell1.hasLine && cell2.hasLine && cell1.color !== cell2.color) &&
              (cell1.isEmpty || cell2.isEmpty));

          edges[edgeId] = {
            connected: connected,
            possible: possible,
          };
        }
      });
    });

    board.edges = edges;

    return board;
  }

  // Stub for the old data format. TODO Replace usage of this with new format when it makes more sense
  get data(): Array<Array<Cell>> {
    const grid = [];
    Object.keys(this.cells).forEach((cellId) => {
      // TODO: Extract this to a utility function
      const position = Position.fromString(cellId);
      const { x, y } = position;
      if (!grid[y]) {
        grid[y] = [];
      }
      grid[y][x] = this.cells[cellId];
    });
    return grid;
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
    if (!cell.hasLine) return []; // For walls, etc
    return this.getNeighborCells(position)
      .filter((neighborCell) => {
        return neighborCell.hasLine && neighborCell.color == cell.color;
      })
      .map((c) => c.position);
  }

  pushColor(position: Position, color: string, avoidColors: Array<string> = []): boolean {
    const cell = this.getCell(position);
    if (cell.isEndpoint) return cell.color === color;
    const connections = this.getConnections(position);
    this.setColor(position, color);
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
          return (
            this.isValidPosition(newPos) &&
            // !isEqual(pos, path.at(-2)) &&
            !path.some((prevPos) => {
              return isEqualObj(newPos, prevPos);
            }) &&
            // Don't path through the currently pushing path, except to finish connecting
            (cell.color !== color || cell.isTail(this)) &&
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
      partialQualityHeuristic: (path, target) => {
        const pos = path.at(-1);
        const euclideanDistanceRemaining =
          Math.abs(pos.x - target.x) + Math.abs(pos.y - target.y);
        return path.length + euclideanDistanceRemaining;
      },
    };
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
        const newPositions = candidatePositions.filter((newPos) => {
          const cell = this.getCell(newPos);
          return (
            this.isValidPosition(newPos) &&
            // !isEqual(pos, path.at(-2)) &&
            !path.some((prevPos) => isEqualObj(newPos, prevPos)) &&
            (cell.isEmpty ||
              (cell.isTail(this) && cell.color === this.getCell(pos1).color))
          );
        });
        return newPositions.map((newPos) => {
          return path.concat([newPos]);
        });
      },
      // fn: partial solution quality heuristic (what properties must it have to guarantee optimality, again?)
      // Smaller is better
      partialQualityHeuristic: (path, target) => {
        const pos = path.at(-1);
        const euclideanDistanceRemaining =
          Math.abs(pos.x - target.x) + Math.abs(pos.y - target.y);
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
    const paths: Array<Path> = [[pos1]];
    if (rules.allowBacktracking) {
      // TODO: Get the current already-existing path on each end
      // and include backtracks of those paths in the path list.
      // May require refactoring to allow searching from both ends??
    }
    while (true) {
      // Sort backwards so we can pop cheaply. Best paths are at the end.
      paths.sort(
        (a, b) =>
          -(
            rules.partialQualityHeuristic(a, pos2) -
            rules.partialQualityHeuristic(b, pos2)
          )
      );
      // console.log("===============");
      // for (const path of paths) {
      //   console.log(
      //     rules.partialQualityHeuristic(path, pos2),
      //     path.map((p) => JSON.stringify(p)).join("\n")
      //   );
      // }
      const path = paths.pop();

      // Check finish conditions
      if (!path) return null; // We've run out of paths to try
      if (isEqualObj(path.at(-1), pos2)) return Path.from(path); // We've found the exit

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
        const newPosition = new Position({
          x: position.x + direction.dx,
          y: position.y + direction.dy,
        });
        if (!this.isValidPosition(newPosition)) {
          return null;
        }
        return newPosition;
      })
      .filter((c) => c);
  }

  getNeighborEdgeIds(position): string[] {
    return this.getNeighborPositions(position).map((pos2) => {
      return createEdgeIdFromPositions(position, pos2);
    });
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

  _getColors(): Set<string> {
    return new Set(
      Array.from(this.iterateCells())
        .map((cell) => cell.color)
        .filter((color) => COLORS.includes(color))
    );
  }

  _getDimensions() {
    let width = 0;
    let height = 0;
    for (const cell of this.iterateCells()) {
      if (!cell.position) {
        console.log({ cell });
        throw new Error(`No position on cell! ${JSON.stringify(cell)}`);
      }
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
    for (const cell of Object.values(this.cells)) {
      yield cell;
    }
  }

  /**
   * Finds all the loose tails of current lines
   * Will return starter cell if it has no line yet
   */
  *iterateTails() {
    for (const cell of this.iterateFilledCells()) {
      if (cell.isTail(this)) {
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
        if (isEqualObj(newPos, pos2)) {
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
    for (const filterFn of [(pos) => this.getCell(pos).isEmpty, (pos) => true]) {
      while (new Set(remainingPositions.filter(filterFn)).size > 0) {
        const cell = this.getCell(remainingPositions.getOne(filterFn));
        // either:
        // cell is empty or a tail
        //   -> start an area there, explore it to completion
        if (cell.isActive(this)) {
          const area = Area.fromCell(this, cell);
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
  static simplifyEdgeColorOrderings(
    colorOrderings: Array<AreaColors>
  ): Array<AreaColors> {
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
    const simplifiedColorOrderings = Board.simplifyEdgeColorOrderings(areaColorSets);
    if (
      simplifiedColorOrderings.some(
        (ordering) =>
          ordering.perimeterColors.length > 0 || ordering.lineColors.size === 0
      )
    ) {
      return false;
    }

    // const simplifiedColorOrderings = colorOrderings.map((ordering) => {
    //   const simplifiedOrdering = Board.simplifyEdgeColorOrdering(ordering, colorOrderings);
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
    if (
      areas.some((area) => !area.positions.some((pos) => this.getCell(pos).isTail(this)))
    ) {
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
        if (!this.getCell(newPosition).isEmpty) return false;
        const hypotheticalBoard = new Board(this.cells, this.edges, this.rules);
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
    try {
      const { board } = await this._solve();
      return board;
    } catch (e) {
      console.trace(e);
    }
  }

  // TODO fix this any type
  async _solve(
    copy = true,
    recursionAttempts = 0
  ): Promise<{ board; isComplete; recursionAttempts }> {
    // if (level > 3) {
    //   return this;
    // }
    // console.log(this.toString());
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

    // console.log(this.toString());
    // return [this, recursionAttempts];

    // When ambiguous, use A*
    // Heuristics:
    // - TODO Move along the perimeter if touching the inactive edge
    // - TODO Move toward the same color tail
    for (const tail of this.iterateTails()) {
      for (const emptyCell of this.getNeighborCells(tail).filter((n) => n.isEmpty)) {
        const hypothesisBoard = new Board(this.cells, this.edges, this.rules);
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
      // console.log(this.toString());
      madeChanges = false;
      for (const tail of this.iterateTails()) {
        const neighbors = this.getNeighborCells(tail);
        const emptyNeighbors = neighbors.filter((neighbor) => neighbor.isEmpty);
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

  // Find edges that must be or cannot be connected, and update them
  propagateEdgeConstraints() {
    for (const cellId in this.cells) {
      const edgeIds = this.getNeighborEdgeIds(Position.fromString(cellId));
      const edges = edgeIds.map((id) => this.edges[id]);

      const cell = this.cells[cellId];
      const requiredConnections = cell.requiredConnections;
      const currentConnections = edges.reduce(
        (acc, edge) => (edge.connected ? acc + 1 : acc),
        0
      );
      const possibleConnections = edges.reduce(
        (acc, edge) => (edge.possible ? acc + 1 : acc),
        0
      );

      // If more are required than are possible, or more are connected than are required, mark this as an error
      if (requiredConnections > possibleConnections) {
        cell.error = true;
        cell.errorMessage = `This cell requires ${requiredConnections} but can only make a max of ${possibleConnections}`;
      }
      if (currentConnections > requiredConnections) {
        cell.error = true;
        cell.errorMessage = `This cell requires exactly ${requiredConnections} but has ${possibleConnections}, which it too many.`;
      }

      // If only # required are possible, connect them
      if (requiredConnections == possibleConnections) {
        edges.forEach((edge) => {
          if (edge.possible) {
            edge.connected = true;
          }
        });
      }

      // If # required are already connected, mark the others impossible
      if (requiredConnections == currentConnections) {
        edges.forEach((edge) => {
          if (!edge.connected) {
            edge.possible = false;
          }
        });
      }
    }
  }
}
