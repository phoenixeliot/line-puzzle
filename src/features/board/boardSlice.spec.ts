import boardReducer, {
  BoardState,
  createEdgeIdFromPoints,
  getEdge,
  getEdgeIdsForCell,
  Point,
  boardSlice,
} from "./boardSlice";

fdescribe("counter reducer", () => {
  const initialState: BoardState = {
    width: 3,
    height: 3,
    edges: {},
    cells: {},
  };
  it("should handle initial state", () => {
    expect(boardReducer(undefined, { type: "unknown" })).toEqual({
      width: null,
      height: null,
      edges: {},
      cells: {},
    });
  });

  describe("createEdgeIdFromPoints", () => {
    it("generates a pair of points", () => {
      expect(createEdgeIdFromPoints({ x: 0, y: 0 }, { x: 0, y: 1 })).toEqual("0,0;0,1");
    });
    it("sorts the pair of points", () => {
      expect(createEdgeIdFromPoints({ x: 0, y: 1 }, { x: 0, y: 0 })).toEqual("0,0;0,1");
    });
  });

  describe("getEdgeIdsForCell", () => {
    it("should return four edges for a center cell", () => {
      const edgeIds = getEdgeIdsForCell(initialState, new Point({ x: 1, y: 1 }));
      expect(edgeIds).toHaveLength(4);
    });
    it("should return two edges for a corner cell", () => {
      const edgeIds = getEdgeIdsForCell(initialState, new Point({ x: 0, y: 0 }));
      expect(edgeIds).toHaveLength(2);
    });
    it("should return three edges for a side cell", () => {
      const edgeIds = getEdgeIdsForCell(initialState, new Point({ x: 1, y: 0 }));
      expect(edgeIds).toHaveLength(3);
    });
  });

  describe("getEdge", () => {
    it("should return a default state if not initialized", () => {
      const edgeId = createEdgeIdFromPoints({ x: 0, y: 0 }, { x: 0, y: 1 });
      expect(getEdge(initialState, edgeId)).toEqual({
        connected: false,
        possible: true,
      });
    });
  });
  describe("setEdge", () => {
    it("should update the edge that was set", () => {
      const edgeId = createEdgeIdFromPoints({ x: 0, y: 0 }, { x: 0, y: 1 });
      expect(getEdge(initialState, edgeId)).toEqual({
        connected: false,
        possible: true,
      });
      const newState = boardReducer(
        initialState,
        boardSlice.actions.setEdge({ edgeId, edgeState: { connected: true } })
      );
      // defaultEdgeState should not be modified
      expect(getEdge(initialState, edgeId)).toEqual({
        connected: false,
        possible: true,
      });
      // Edge should be updated
      expect(getEdge(newState, edgeId)).toEqual({
        connected: true,
        possible: true,
      });
    });
  });
  describe("markImpossibleEdges", () => {
    it("should mark other edges impossible if two edges are filled for a cell", () => {
      // const centerPoint = {x:1,y:1}
      let newState = initialState;
      const centerPoint = { x: 1, y: 1 };
      console.log(newState);
      newState = boardReducer(
        newState,
        boardSlice.actions.setEdge({
          edgeId: createEdgeIdFromPoints(centerPoint, { x: 0, y: 1 }),
          edgeState: { connected: true },
        })
      );
      console.log(newState);
      newState = boardReducer(
        newState,
        boardSlice.actions.setEdge({
          edgeId: createEdgeIdFromPoints(centerPoint, { x: 2, y: 1 }),
          edgeState: { connected: true },
        })
      );
      console.log(newState);
      newState = boardReducer(
        newState,
        boardSlice.actions.markImpossibleEdges({ point: centerPoint })
      );
      console.log(newState);
      // The other two edges should be marked as not possible
      expect(
        getEdge(newState, createEdgeIdFromPoints(centerPoint, { x: 1, y: 0 }))
      ).toEqual({
        connected: false,
        possible: false,
      });
      expect(
        getEdge(newState, createEdgeIdFromPoints(centerPoint, { x: 1, y: 2 }))
      ).toEqual({
        connected: false,
        possible: false,
      });
    });
  });
});
