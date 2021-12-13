import { Board } from "../src/board";
import * as gridRules from "../src/gridRules";

describe("Cell", () => {
  it("converts to JSON withour board", () => {
    const board = Board.fromString("O", gridRules);
    const cell = board.getCell({x:0,y:0})
    expect(JSON.stringify(cell)).toEqual(JSON.stringify({
      color: "O",
      position: {x:0,y:0},
      isEndpoint: true,
    }))
  })
})
