import isEqual from "lodash/isEqual";
import { SerializedSet } from "./SerializedSet";
import { Position, getNextClockwiseDirection, getClockwiseDirectionsStartingWith } from "./Board";
import { Cell } from "./Cell";
import { getNeighborDirections } from "./gridRules";

/**
 * Represents an open area of a board, including empty spaces and tails, but not including walls or line segments
 */
export class Area {
  positions: Array<Position>;
  perimeter: Array<Position>; // Clockwise ordered cells marking the outer edge of the area

  constructor({
    positions,
    perimeter,
  }: {
    positions: Array<Position>;
    perimeter: Array<Position>;
  }) {
    this.positions = positions;
    this.perimeter = perimeter;
  }

  static fromCell(cell: Cell): Area {
    const board = cell.board;
    if (!cell.isActive()) {
      throw Error(
        "Invalid starting cell for finding an area (cell is not active)" + JSON.stringify(cell)
      );
    }

    // Flood-fill to find all cells in the area
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

    // Special case: A single empty cell
    if (filledPositions.size == 1) {
      return new Area({
        positions: Array.from(filledPositions),
        perimeter: Array.from(filledPositions),
      });
    }

    // Get the perimeter from the filled area (all cells that aren't surrounded by other cells in the area)
    const unorderedPerimeter = new SerializedSet(
      Array.from(filledPositions).filter((position) => {
        return !cell.board.getNeighborCells(position).every((neighbor) => {
          filledPositions.has(neighbor.position);
        });
      })
    );

    // Find the next cell on the perimeter, going clockwise
    const perimeterStart = unorderedPerimeter.getOne();
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
        throw new Error("Didn't find next item on perimeter path — this should not happen.");
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
