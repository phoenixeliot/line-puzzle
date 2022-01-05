import { Board } from "../src/board";
import * as gridRules from "../src/gridRules";
import { dedent } from "./utils";

describe("Cell", () => {
  it("converts to JSON without board circular reference", () => {
    const board = Board.fromString("Y", gridRules);
    const cell = board.getCell({ x: 0, y: 0 });
    expect(JSON.parse(JSON.stringify(cell))).toMatchObject({
      color: "Y",
      position: { x: 0, y: 0 },
      isEndpoint: true,
    });
  });
  describe("isTail", () => {
    const board = Board.fromString(
      dedent`
        ##Yy-
        BbB--
        ##Oo-
      `,
      gridRules
    );
    it("returns false for walls, empty spaces, and line segments", () => {
      expect(board.getCell({ x: 0, y: 0 }).isTail(board)).toBe(false);
      expect(board.getCell({ x: 4, y: 0 }).isTail(board)).toBe(false);
      expect(board.getCell({ x: 1, y: 1 }).isTail(board)).toBe(false);
    });
    it("returns true for tails", () => {
      expect(board.getCell({ x: 3, y: 0 }).isTail(board)).toBe(true);
      expect(board.getCell({ x: 3, y: 2 }).isTail(board)).toBe(true);
    });
  });
});
