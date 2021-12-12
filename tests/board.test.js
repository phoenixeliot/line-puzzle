import hex5x5_1 from "./fixtures/hex5x5_1";
import { dedent } from "./utils";
import { Board } from "../src/board.js";
import * as gridRules from "../src/gridRules";
import * as hexRules from "../src/hexRules";

describe("dedent utility", () => {
  it("Removes extraneous whitespace", () => {
    expect(dedent`
      ABC
      #-D
      .a2
    `).toEqual("ABC\n#-D\n.a2")
  })
})

describe("Board", () => {
  describe("toString", () => {
    it("prints out a board identical to the input", () => {
      const boardString = dedent`
        OBBY
        O#BB
        OO#B
        YO--
      `;
      expect(
        Board.fromString(
          boardString,
          gridRules
        ).toString()
      ).toEqual(boardString);
    })
  })
  describe("getColors", () => {
    it("returns the colors of a board", () => {
      expect(
        Board.fromString(
          dedent`
            B#-
            #Y-
            O--
          `
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
            BYO
            BYO
          `,
          gridRules
        ).isComplete()
      ).toBe(true);
      expect(
        Board.fromString(
          dedent`
            BYY
            BY-
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
            B
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
            BYO
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
            OBBY
            O#BB
            OO#B
            YOOO
          `,
          gridRules
        ).isComplete()
      ).toBe(false);
    });
  });
});
