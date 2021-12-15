import hex5x5_1 from "./fixtures/hex5x5_1";
import { dedent } from "./utils";
import { Board, getClockwiseDirectionsStartingWith, getNextClockwiseDirection } from "../src/Board";
import { Area } from "../src/Area";
import * as gridRules from "../src/gridRules";
import * as hexRules from "../src/hexRules";

describe("getNextClockwiseDirection", () => {
  it("returns the next clockwise direction", () => {
    expect(
      getNextClockwiseDirection({ dx: -1, dy: 0 }, [
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: -1 },
      ])
    ).toEqual({ dx: 0, dy: -1 });
  });
});

describe("toString", () => {
  it("prints cells in the area", () => {
    const board = Board.fromString(
      dedent`
      -B-
      -bB
      ---
      `,
      gridRules
    );
    const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
    expect(area.toString(board)).toEqual(dedent`
    @--
    @--
    @@@
    `);
  });
  it("prints cells in the area", () => {
    const board = Board.fromString(
      dedent`
      ---B
      ---B
      ----
      ----
      ----
      `,
      gridRules
    );
    const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
    expect(area.toString(board)).toEqual(dedent`
    @@@-
    @^@-
    @^@@
    @^^@
    @@@@
    `);
  });
});

describe("getClockwiseDirectionsStartingWith", () => {
  it("returns a list with the given direction first", () => {
    expect(
      getClockwiseDirectionsStartingWith({ dx: -1, dy: 0 }, [
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: -1 },
      ])
    ).toEqual([
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
    ]);
  });
});

describe("Area", () => {
  describe("fromCell", () => {
    it("throws an error for invalid starting cell", () => {
      const board = Board.fromString(
        dedent`
        #-
        --
      `,
        gridRules
      );
      expect(() => {
        const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
      }).toThrowError();
    });
    it("fills a trivial area", () => {
      const board = Board.fromString(
        dedent`
          --
          --
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
      expect(area.perimeter.length).toEqual(4);
    });
    it("fills an area with a concave start", () => {
      const board = Board.fromString(
        dedent`
          ---
          #--
          ---
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 1, y: 1 }));
      expect(area.perimeter.length).toEqual(10);
    });
    it("fills an area with a very concave start", () => {
      const board = Board.fromString(
        dedent`
          ---
          ---
          #--
          ---
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 1, y: 1 }));
      expect(area.perimeter.length).toEqual(12);
    });
    it("fills an area with trick neighbor (up is not the right direction to connect)", () => {
      const board = Board.fromString(
        dedent`
          ---
          ---
          -#-
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 1, y: 1 }));
      expect(area.perimeter.length).toEqual(10);
    });
    it("fills an area with a completed line", () => {
      const board = Board.fromString(
        dedent`
          --B
          --B
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
      expect(area.perimeter.length).toEqual(4);
    });
    it("fills an area with single-wide side channel and double-counts that channel", () => {
      const board = Board.fromString(
        dedent`
          --BB
          ----
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
      expect(area.perimeter.length).toEqual(8);
      expect(area.body.size).toEqual(0);
    });
    it("fills an area with a hole", () => {
      const board = Board.fromString(
        dedent`
          ---
          -#-
          ---
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
      expect(area.perimeter.length).toEqual(8);
    });
    it("fills an area with a hole and innards", () => {
      const board = Board.fromString(
        dedent`
          -----
          --#--
          -----
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
      expect(area.perimeter.length).toEqual(12);
    });
    it("doesn't explore through endpoint barriers", () => {
      const board = Board.fromString(
        dedent`
        -Y
        B-
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
      expect(area.positions.size).toBe(3);
    });
    it("doesn't explore through tail barriers", () => {
      const board = Board.fromString(
        dedent`
        -Y
        b-
        B-
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
      expect(area.positions.size).toBe(3);
    });
    it("includes inner cells in body", () => {
      const board = Board.fromString(
        dedent`
        -B---
        -G---
        ---Y-
        -----
        -----
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
      expect(area.positions.size).toBe(25);
      expect(area.body.size).toBe(9);
      expect(area.perimeter.length).toBe(16);
    });
    it("includes inner cells in body 2", () => {
      const board = Board.fromString(
        dedent`
        --B####
        ---G###
        -G-----
        -Y---Bb
        ----Y--
        `,
        gridRules
      );
      const area = Area.fromCell(board.getCell({ x: 0, y: 0 }));
      expect(area.toString(board)).toEqual(dedent`
      @@@----
      @^@@---
      @^^@@@@
      @^^^@-@
      @@@@@--
      `);
      expect(area.positions.size).toBe(3 + 4 + 7 + 6 + 5);
      expect(area.body.size).toBe(6);
      expect(area.perimeter.length).toBe(22);
    });
  });
});
