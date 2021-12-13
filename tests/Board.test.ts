import hex5x5_1 from "./fixtures/hex5x5_1";
import { dedent } from "./utils";
import { Board } from "../src/Board";
import * as gridRules from "../src/gridRules";
import * as hexRules from "../src/hexRules";

describe("dedent utility", () => {
  it("Removes extraneous whitespace", () => {
    expect(dedent`
      ABC
      #-D
      .a2
    `).toEqual("ABC\n#-D\n.a2");
  });
});

describe("Board", () => {
  describe("toString", () => {
    it("prints out a board identical to the input", () => {
      const boardString = dedent`
        OBbY
        o#bb
        oo#B
        YO--
      `;
      expect(Board.fromString(boardString, gridRules).toString()).toEqual(boardString);
    });
  });
  describe("getColors", () => {
    it("returns the colors of a board", () => {
      expect(
        Board.fromString(
          dedent`
            B#-
            #Yy
            O--
          `,
          gridRules
        ).getColors()
      ).toEqual(new Set(["B", "Y", "O"]));
    });
  });
  describe("isComplete", () => {
    it("checks if board is completely filled", () => {
      expect(
        Board.fromString(
          dedent`
            BYO
            byo
            BYO
          `,
          gridRules
        ).isComplete()
      ).toBe(true);
      expect(
        Board.fromString(
          dedent`
            ByY
            by-
            BY-
          `,
          gridRules
        ).isComplete()
      ).toBe(false);
    });

    it("makes sure all lines are complete", () => {
      expect(
        Board.fromString(
          dedent`
            B
            b
            B
          `,
          gridRules
        ).isComplete()
      ).toBe(true);
    });

    it("it returns true when all paths are complete", () => {
      expect(
        Board.fromString(
          dedent`
            BYO
            byo
            BYO
          `,
          gridRules
        ).isComplete()
      ).toBe(true);
    });
    it("returns false when one path is incomplete", () => {
      expect(
        Board.fromString(
          dedent`
            OBbY
            o#bb
            oo#B
            YooO
          `,
          gridRules
        ).isComplete()
      ).toBe(false);
    });
  });
  describe("iterateTails", () => {
    it("returns endpoints if there are no line segments yet", () => {
      const tails = Array.from(
        Board.fromString(
          dedent`
        O-O
      `,
          gridRules
        ).iterateTails()
      );
      expect(tails.length).toBe(2);
      const tails2 = Array.from(
        Board.fromString(
          dedent`
        OBY
        ---
        OBY
      `,
          gridRules
        ).iterateTails()
      );
      expect(tails2.length).toBe(6);
    });
    it("returns a mix of endpoints and tails", () => {
      const tails = Array.from(
        Board.fromString(
          dedent`
        O-oO
      `,
          gridRules
        ).iterateTails()
      );
      expect(tails.length).toBe(2);
      const tails2 = Array.from(
        Board.fromString(
          dedent`
        OBY
        -b-
        o-y
        OBY
      `,
          gridRules
        ).iterateTails()
      );
      expect(tails2.length).toBe(6);
    });
    it("returns tails", () => {
      const tails = Array.from(
        Board.fromString(
          dedent`
        Oo-oO
      `,
          gridRules
        ).iterateTails()
      );
      expect(tails.length).toBe(2);
      const tails2 = Array.from(
        Board.fromString(
          dedent`
        OBY
        oby
        ---
        oby
        OBY
      `,
          gridRules
        ).iterateTails()
      );
      expect(tails2.length).toBe(6);
    });
  });
  describe("canConnect", () => {
    it("detects unconnectable paths", () => {
      expect(Board.fromString("O-#-O", gridRules).canConnect({ x: 0, y: 0 }, { x: 4, y: 0 })).toBe(
        false
      );
    });
    it("detects connectable paths", () => {
      expect(Board.fromString("O---O", gridRules).canConnect({ x: 0, y: 0 }, { x: 4, y: 0 })).toBe(
        true
      );
    });
  });
  describe("getOpenAreas", () => {
    it("finds a trivial open area", () => {
      const openAreas = Board.fromString(
        dedent`
          --
          --
        `,
        gridRules
      ).getOpenAreas();
      expect(openAreas.length).toBe(1);
      expect(openAreas[0].perimeter.length).toBe(4);
    });
    it("finds a tight open area", () => {
      const openAreas = Board.fromString(
        dedent`
          ###
          #-#
          ###
        `,
        gridRules
      ).getOpenAreas();
      expect(openAreas.length).toBe(1);
      expect(openAreas[0].perimeter.length).toBe(1);
    });
    it("handles thin channels", () => {
      const openAreas = Board.fromString(
        dedent`
          ##-#
          ----
          ##-#
        `,
        gridRules
      ).getOpenAreas();
      expect(openAreas.length).toBe(1);
      expect(openAreas[0].perimeter.length).toBe(10);
    });

    it("includes tails", () => {
      const openAreas = Board.fromString(
        dedent`
        --Y
        --y
        ---
        ---
      `,
        gridRules
      ).getOpenAreas();
      expect(openAreas.length).toBe(1);
      expect(openAreas[0].perimeter.length).toBe(10);
    });
    it("includes tails and isolated endpoints", () => {
      const board = Board.fromString(
        dedent`
        #Yy-
        BB--
        #Oo-
      `,
        gridRules
      );
      const openAreas = board.getOpenAreas();
      expect(openAreas.length).toBe(1);
      expect(openAreas[0].perimeter.length).toBe(6);
    });
    it("includes tails but not line segment endpoints", () => {
      const board = Board.fromString(
        dedent`
        #Yy-
        BB--
        #Oo-
      `,
        gridRules
      );
      const openAreas = board.getOpenAreas();
      expect(openAreas.length).toBe(1);
      expect(openAreas[0].perimeter.length).toBe(6);
    });
  });
  describe("getEdgeColorOrdering", () => {
  })
  describe("simplifyEdgeColorOrdering", () => {
    it("does nothing to knots", () => {
      const board = new Board();
      expect(board.simplifyEdgeColorOrdering(["B", "Y", "B", "Y"])).toEqual(["B", "Y", "B", "Y"]);
    });
    it("collapses singles", () => {
      const board = new Board();
      expect(board.simplifyEdgeColorOrdering(["Y", "B", "R"])).toEqual([]);
    });
    it("collapses pairs", () => {
      const board = new Board();
      expect(board.simplifyEdgeColorOrdering(["Y", "B", "B", "Y"])).toEqual([]);
    });
    it("collapses singles and pairs combined", () => {
      const board = new Board();
      expect(board.simplifyEdgeColorOrdering(["Y", "B", "R", "B", "G", "Y"])).toEqual([]);
    });
  });
  describe("isValidPartial", () => {
    it("rejects isolated endpoints", () => {
      const boardString = dedent`
        ObB
        BbY
        OYy
      `;
      expect(Board.fromString(boardString, gridRules).isValidPartial()).toBe(false);
    });
    it("rejects separated sides", () => {
      const boardString = dedent`
        --Y-O
        --y--
        O-Y--
      `;
      expect(Board.fromString(boardString, gridRules).isValidPartial()).toBe(false);
    });
    it("accepts grids with items on same side of a separation", () => {
      const boardString = dedent`
        O-Y--
        --y--
        O-Y--
      `;
      expect(Board.fromString(boardString, gridRules).isValidPartial()).toBe(true);
    });
    it("accepts a board with open space", () => {
      const boardString = dedent`
        O-B
        --Y
        OB-
        Y--
      `;
      expect(Board.fromString(boardString, gridRules).isValidPartial()).toBe(true);
    });
    it("rejects a board with knotted endpoints", () => {
      const boardString = dedent`
        B-Y
        ---
        Y-B
      `;
      expect(Board.fromString(boardString, gridRules).isValidPartial()).toBe(false);
    });
    it("rejects a board with knotted tails", () => {
      const boardString = dedent`
        B-yY
        b---
        ---b
        Yy-B
      `;
      expect(Board.fromString(boardString, gridRules).isValidPartial()).toBe(false);
    });
  });
});
