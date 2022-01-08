import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState, AppThunk } from "../../app/store";

type CellIdentifier = string; // point coordinates, eg "1,1"
interface CellState {
  color: null | string;
}

type EdgeIdentifier = string; // pointA-pointB; eg "1,1-1,2"
interface EdgeState {
  possible: boolean;
  connected: boolean;
}

export interface BoardState {
  width: number;
  height: number;
  cells: Record<CellIdentifier, CellState>;
  edges: Record<EdgeIdentifier, EdgeState>; // Connections between adjacent cells
}

export class Point extends Object {
  x: number;
  y: number;
  constructor(obj: Point) {
    super();
    const { x, y } = obj;
    Object.assign(this, { x, y });
  }
  toString() {
    return `${this.x},${this.y}`;
  }
  static min(a, b) {
    if (a.x < b.x) return a;
    if (a.x > b.x) return b;
    if (a.y < b.y) return a;
    if (a.y > b.y) return b;
    return a;
  }
}

const initialState = {
  width: null,
  height: null,
  cells: {},
  edges: {},
};

// export const incrementIfOdd =
//   (amount: number): AppThunk =>
//   (dispatch, getState) => {
//     const currentValue = selectCount(getState());
//     if (currentValue % 2 === 1) {
//       dispatch(incrementByAmount(amount));
//     }
//   };

function _setEdge(state, edgeId, edgeState) {
  if (!state.edges[edgeId]) {
    state.edges[edgeId] = Object.assign({}, defaultEdgeState);
  }
  Object.assign(state.edges[edgeId], edgeState);
}

export const boardSlice = createSlice({
  name: "board",
  initialState,
  reducers: {
    setBoardSize(state: BoardState, action: PayloadAction<[number, number]>) {
      const [width, height] = action.payload;
      return {
        ...state,
        width,
        height,
      };
    },
    setEdge(
      state: BoardState,
      action: PayloadAction<{ edgeId: EdgeIdentifier; edgeState: Partial<EdgeState> }>
    ) {
      const { edgeId, edgeState } = action.payload;
      _setEdge(state, edgeId, edgeState);
    },
    markImpossibleEdges(state: BoardState, action: PayloadAction<{ point: Point }>) {
      const { point } = action.payload;
      const edgeIds = getEdgeIdsForCell(state, point);
      const numConnected = edgeIds
        .map((edgeId) => getEdge(state, edgeId))
        .reduce((acc, edge) => {
          return acc + (edge.connected ? 1 : 0);
        }, 0);
      console.log({ numConnected });
      if (numConnected >= 2) {
        for (const edgeId of edgeIds) {
          console.log(edgeId, getEdge(state, edgeId));
          if (!getEdge(state, edgeId).connected) {
            _setEdge(state, edgeId, { possible: false });
          }
        }
      }
    },
    setCell(state, action: PayloadAction<[Point, Partial<CellState>]>) {
      const [point, newCellState] = action.payload;
      const cellIdentifier = point.toString();
      state.cells[cellIdentifier] = newCellState;
    },
  },
});

export interface PointDelta {
  dx: number;
  dy: number;
}

// TODO: make generic for hex
const DIRECTIONS: Record<string, PointDelta> = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  RIGHT: { dx: 1, dy: 0 },
  LEFT: { dx: -1, dy: 0 },
};

export function isPointOnBoard(boardState: BoardState, point: Point) {
  return (
    point.x >= 0 &&
    point.x < boardState.width &&
    point.y >= 0 &&
    point.y < boardState.height
  );
}

export function movePoint(point: Point, delta: PointDelta) {
  return new Point({
    x: point.x + delta.dx,
    y: point.y + delta.dy,
  });
}

export function getEdgeIdsForCell(
  boardState: BoardState,
  point1: Point,
  directions = DIRECTIONS
) {
  const edgeIds = Object.values(directions)
    .map((dir) => {
      let point2 = movePoint(point1, dir);
      if (!isPointOnBoard(boardState, point2)) {
        return null;
      }
      return createEdgeIdFromPoints(point1, point2);
    })
    .filter((v) => v);
  return edgeIds;
}

// export function getEdgesForCell(
//   boardState: BoardState,
//   point: Point,
//   directions = DIRECTIONS
// ) {
//   const edgeIds = getEdgeIdsForCell(boardState, point, directions);
//   return Object.fromEntries(
//     edgeIds.map((edgeId) => {
//       return [edgeId, boardState.edges[edgeId]];
//     })
//   );
// }

const defaultEdgeState = {
  possible: true,
  connected: false,
};

export function getEdge(boardState: BoardState, edgeId: EdgeIdentifier) {
  return Object.assign({}, defaultEdgeState, boardState.edges[edgeId]);
}

export function createEdgeIdFromPoints(point1: Point, point2: Point): EdgeIdentifier {
  if (Point.min(point1, point2) === point2) {
    // Swap so the lesser-sorted point is first, so identifiers are unique
    [point1, point2] = [point2, point1];
  }
  return `${new Point(point1).toString()};${new Point(point2).toString()}`;
}

export default boardSlice.reducer;
