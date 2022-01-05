import isEqual from "lodash/isEqual";
import { SerializedSet } from "./SerializedSet";
import {
  Position,
  getNextClockwiseDirection,
  getClockwiseDirectionsStartingWith,
  Board,
} from "./Board";
import { Cell } from "./Cell";
import { getNeighborDirections } from "./gridRules";

/**
 * Represents an open area of a board, including empty spaces and tails, but not including walls or line segments
 */
export class Area {
  positions: SerializedSet<Position>;
  perimeter: Array<Position>; // Clockwise ordered cells marking the outer edge of the area
  body: SerializedSet<Position>;

  constructor({
    positions,
    perimeter,
  }: {
    positions: SerializedSet<Position>;
    perimeter: Array<Position>;
  }) {
    this.positions = positions;
    this.perimeter = perimeter;
    const perimeterSet = new SerializedSet<Position>(perimeter);
    this.body = new SerializedSet(
      Array.from(positions.filter((p) => !perimeterSet.has(p)))
    );
  }

  toString(board?: Board): string {
    const grid = [];
    if (board) {
      for (const cell of board.iterateCells()) {
        if (!grid[cell.position.y]) {
          grid[cell.position.y] = [];
        }
        grid[cell.position.y][cell.position.x] = "-";
      }
    }
    for (const position of this.positions) {
      grid[position.y][position.x] = "^";
    }
    for (const position of this.perimeter) {
      grid[position.y][position.x] = "@";
    }
    return grid.map((row) => row.join("")).join("\n");
  }

  getInnerColors(board: Board) {
    const cells = this.body.map((p) => board.getCell(p));
    return new Set(cells.filter((c) => c.hasLine()).map((c) => c.color));
  }

  static fromCell(board: Board, cell: Cell): Area {
    if (!cell.isActive(board)) {
      throw Error(
        "Invalid starting cell for finding an area (cell is not active)" +
          JSON.stringify(cell)
      );
    }

    // Flood-fill to find all cells in the area
    const filledPositions = new SerializedSet<Position>();
    const growingEdge = new SerializedSet<Position>([cell.position]);
    while (growingEdge.size > 0) {
      for (const newPos of growingEdge) {
        // Don't explore "through" tails; tails can close off an area from another.
        if (board.getCell(newPos).isEmpty()) {
          // Breadth-first include all active neighbors in the space to explore
          const unexploredNeighbors = board
            .getNeighborCells(newPos)
            .filter((neighborCell) => {
              return (
                neighborCell.isActive(board) &&
                !filledPositions.has(neighborCell.position) &&
                !growingEdge.has(neighborCell.position)
              );
            });
          unexploredNeighbors.forEach((cell) => growingEdge.add(cell.position));
        }
        filledPositions.add(newPos);
        growingEdge.delete(newPos);
      }
    }

    // Special case: A single empty cell
    if (filledPositions.size == 1) {
      return new Area({
        positions: filledPositions,
        perimeter: Array.from(filledPositions),
      });
    }

    // Get the perimeter from the filled area (all cells that aren't surrounded by other cells in the area)
    const unorderedPerimeter = new SerializedSet(
      Array.from(filledPositions).filter((position) => {
        return !board.getNeighborCells(position).every((neighbor) => {
          filledPositions.has(neighbor.position);
        });
      })
    );

    // Start from the top-leftmost cell, because that cell can't be surrounded by more than 2 perimeter cells incl across 2-wide channels
    const perimeterStart = unorderedPerimeter.min((a, b) => {
      if (a.x < b.x) return a;
      if (a.x > b.x) return b;
      if (a.y < b.y) return a;
      if (a.y > b.y) return b;
    });
    // Find the next cell on the perimeter, going clockwise
    let nextNeighbor;
    let nextStartDirection;
    {
      // The clockwise oriented one is the one that, if you turn one more step clockwise,
      // you run into something in the body, or the other perimeter connection
      const neighbors = board.getNeighborPositions(perimeterStart);
      const neighborPerimeterCells = neighbors.filter((neighbor) =>
        unorderedPerimeter.has(neighbor)
      );
      // In most cases it will be 2, but it can be 1 along single-width channels (since the forward-and-back item isn't double counted)
      // TODO: Rethink this logic. Neighboring perimeter cells may be on the 'other side' of a 2-wide part, resulting in up to 4 on a grid.
      if (!new Set([1, 2]).has(neighborPerimeterCells.length)) {
        throw new Error(
          `Something went wrong in perimeter calculation (neighborPerimeterCells.length is ${neighborPerimeterCells.length})`
        );
      }

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
          nextStartDirection = getNextClockwiseDirection(
            { dx: -direction.dx, dy: -direction.dy },
            rotatedDirections
          );
          foundNext = true;
          break;
        }
      }
      if (!foundNext) {
        throw new Error(
          "Didn't find next item on perimeter path — this should not happen."
        );
      }
      if (isEqual(nextNeighbor, perimeterStart)) {
        break;
      }
      clockwisePerimeter.push(nextNeighbor);
    }

    return new Area({
      positions: filledPositions,
      perimeter: clockwisePerimeter,
    });
  }
}
