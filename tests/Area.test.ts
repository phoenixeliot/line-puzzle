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
      const board = Board.fromString(dedent`
        #-
        --
      `, gridRules);
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
  });
});
