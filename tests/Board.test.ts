import hex5x5_1 from "./fixtures/hex5x5_1";
import { dedent } from "./utils";
import { Area } from "../src/Area";
import { AreaColors, Board } from "../src/Board";
import * as gridRules from "../src/gridRules";
import * as hexRules from "../src/hexRules";
import { SerializedSet } from "../src/SerializedSet";

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
        )._getColors()
      ).toEqual(new Set(["B", "Y", "O"]));
    });
  });
  describe("canConnect", () => {
    it("detects unconnectable paths", () => {
      expect(
        Board.fromString("O-#-O", gridRules).canConnect({ x: 0, y: 0 }, { x: 4, y: 0 })
      ).toBe(false);
    });
    it("detects connectable paths", () => {
      expect(
        Board.fromString("O---O", gridRules).canConnect({ x: 0, y: 0 }, { x: 4, y: 0 })
      ).toBe(true);
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
    it.todo("gets the colors of a closed-off area");
    it.todo("gets the colors of just endpoints");
    it.todo("gets the colors of just tails");
    it.todo("gets the colors of tails and endpoints");
  });
  describe("simplifyEdgeColorOrderings", () => {
    it("does nothing to knots", () => {
      const board = new Board();
      expect(
        board.simplifyEdgeColorOrderings([
          new AreaColors({ perimeterColors: ["B", "Y", "B", "Y"] }),
        ])
      ).toMatchObject([{ perimeterColors: ["B", "Y", "B", "Y"] }]);
    });
    xit("collapses singles", () => {
      const board = new Board();
      expect(
        board.simplifyEdgeColorOrderings([
          new AreaColors({
            perimeterColors: ["Y", "B", "R"],
            innerColors: new Set(["Y", "B", "R"]),
          }),
        ])
      ).toMatchObject([{ perimeterColors: [] }]);
    });
    it("collapses pairs", () => {
      const board = new Board();
      expect(
        board.simplifyEdgeColorOrderings([
          new AreaColors({ perimeterColors: ["Y", "B", "B", "Y"] }),
        ])
      ).toMatchObject([{ perimeterColors: [] }]);
    });
    it("collapses singles and pairs combined", () => {
      const board = new Board();
      expect(
        board.simplifyEdgeColorOrderings([
          new AreaColors({
            perimeterColors: ["Y", "B", "R", "B", "G", "Y"],
            innerColors: new Set(["R", "G"]),
          }),
        ])
      ).toMatchObject([{ perimeterColors: [] }]);
    });
    it("untangles knots that have a component resolved in another area", () => {
      const board = new Board();
      expect(
        board.simplifyEdgeColorOrderings([
          new AreaColors({ perimeterColors: ["R", "O", "R", "O"] }),
          new AreaColors({ perimeterColors: ["R", "R"] }),
        ])
      ).toMatchObject([{ perimeterColors: [] }, { perimeterColors: [] }]);
    });
    it("untangles knots that have a component resolved in another area with a captured singlet", () => {
      const board = new Board();
      expect(
        board.simplifyEdgeColorOrderings([
          new AreaColors({ perimeterColors: ["R", "O", "R", "O"] }),
          new AreaColors({
            perimeterColors: ["R", "Y", "R"],
            innerColors: new Set(["Y"]),
          }),
        ])
      ).toMatchObject([{ perimeterColors: [] }, { perimeterColors: [] }]);
    });
    it("untangles knots that have a component resolved in another area with a captured singlet", () => {
      // Note, this board is invalid, but still we shouldn't resolve these singlets in this function
      const board = Board.fromString(
        dedent`
        B--Y--
        -B-G--
        ---R-R
        Y--G--
        `,
        gridRules
      );
      const areas = board.getOpenAreas();
      const colorOrderings = areas.map((area) => {
        return board.getAreaColors(area);
      });
      const simplifiedColorOrderings = board.simplifyEdgeColorOrderings(colorOrderings);
      expect(simplifiedColorOrderings).toMatchObject([
        { perimeterColors: [] },
        { perimeterColors: [] },
      ]);
    });
    it("resolves singles in shared walls", () => {
      // Note, this board is invalid, but still we shouldn't resolve these singlets in this function
      const board = Board.fromString(
        dedent`
        ---B--
        -B-G--
        ---G--
        ---R-R
        `,
        gridRules
      );
      const areas = board.getOpenAreas();
      const colorOrderings = areas.map((area) => {
        return board.getAreaColors(area);
      });
      const simplifiedColorOrderings = board.simplifyEdgeColorOrderings(colorOrderings);
      expect(simplifiedColorOrderings).toMatchObject([
        { perimeterColors: [] },
        { perimeterColors: [] },
      ]);
    });
    it("doesn't resolve singlets that have their pair in another area", () => {
      // Note, this board is invalid, but still we shouldn't resolve these singlets in this function
      const board = Board.fromString(
        dedent`
        B--Y--
        ---G-B
        ---R-R
        Y--G--
        `,
        gridRules
      );
      const areas = board.getOpenAreas();
      const colorOrderings = areas.map((area) => {
        return new AreaColors({
          perimeterColors: board.getEdgeColorOrdering(area.perimeter),
        });
      });
      const simplifiedColorOrderings = board.simplifyEdgeColorOrderings(colorOrderings);
      expect(simplifiedColorOrderings).not.toMatchObject([
        { perimeterColors: [] },
        { perimeterColors: [] },
      ]);
    });

    it("collapses a complex incomplete valid board", () => {
      // Note, this board is invalid, but still we shouldn't resolve these singlets in this function
      const board = Board.fromString(
        dedent`
        Cc--rrR
        O-OCRbB
        -----bG
        -----gg
        -G-----
        -Y---B-
        ----Y--
        `,
        gridRules
      );
      const areas = board.getOpenAreas();
      const colorOrderings = areas.map((area) => {
        return board.getAreaColors(area);
      });
      const simplifiedColorOrderings = board.simplifyEdgeColorOrderings(colorOrderings);
      expect(simplifiedColorOrderings).toMatchObject([
        { perimeterColors: [] },
        { perimeterColors: [] },
      ]);
    });
    it("detects line-less areas", () => {
      // Note, this board is invalid, but still we shouldn't resolve these singlets in this function
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
      const areas = board.getOpenAreas();
      const colorOrderings = areas.map((area) => {
        const innerColors = area.getInnerColors(board);
        console.log(innerColors);
        return new AreaColors({
          perimeterColors: board.getEdgeColorOrdering(area.perimeter),
          innerColors,
        });
      });
      const simplifiedColorOrderings = board.simplifyEdgeColorOrderings(colorOrderings);
      expect(simplifiedColorOrderings[0].lineColors).toEqual(new Set(["B", "G", "Y"]));
      expect(simplifiedColorOrderings[1].lineColors).toEqual(new Set([]));
      // expect(simplifiedColorOrderings).toMatchObject([{}, { lineColors: new SerializedSet([]) }]);
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
          O-Y-G
          --y--
          O-Y-G
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
    it("rejects a board with a trapped end", () => {
      const boardString = dedent`
          B-Y
          -bB
          -b#
          Ybb
        `;
      expect(Board.fromString(boardString, gridRules).isValidPartial()).toBe(false);
    });
    it("accepts this specific troublesome board", () => {
      const boardString = dedent`
      Cc--rrR
      O-OCRbB
      -----bG
      -----gg
      -G-----
      -Y---B-
      ----Y--
      `;
      expect(Board.fromString(boardString, gridRules).isValidPartial()).toBe(true);
    });
    it("rejects lines that close back on themself", () => {
      const boardString = dedent`
      CcccrrR
      OoOCRbB
      --bbbbG
      ---gggg
      -G-----
      -Y---Bb
      ----Ybb
      `;
      expect(Board.fromString(boardString, gridRules).isValidPartial()).toBe(false);
    });
    it("rejects simple abandoned area", () => {
      const boardString = dedent`
      B#-----
      -Y---Bb
      ----Y--
      `;
      expect(Board.fromString(boardString, gridRules).isValidPartial()).toBe(false);
    });
    it("rejects abandoned area with islands", () => {
      const boardString = dedent`
      --B####
      ---G###
      -G-----
      -Y---Bb
      ----Y--
      `;
      expect(Board.fromString(boardString, gridRules).isValidPartial()).toBe(false);
    });
    it("rejects abandoned area with islands (complex)", () => {
      const boardString = dedent`
      CcccrrR
      OoOCRbB
      --bbbbG
      ---gggg
      -G-----
      -Y---B-
      ----Y--
      `;
      const board = Board.fromString(boardString, gridRules);
      expect(board.isValidPartial()).toBe(true);
    });
    it("rejects abandoned area with islands (complex)", () => {
      const boardString = dedent`
      CcccrrR
      OoOCRbB
      --bbbbG
      ---gggg
      -G-----
      -Y---B-
      ----Yb-
      `;
      const board = Board.fromString(boardString, gridRules);
      board.solveChoicelessMoves();
      expect(board.isValidPartial()).toBe(false);
    });
    it("rejects abandoned area with islands (complex)", () => {
      const boardString = dedent`
      CcccrrR
      OoOCRbB
      --bbbbG
      ---gggg
      -G-----
      -Y---Bb
      ----Y--
      `;
      const board = Board.fromString(boardString, gridRules);
      board.solveChoicelessMoves();
      expect(board.isValidPartial()).toBe(false);
    });
    it("rejects abandoned area with islands (complex)", () => {
      const boardString = dedent`
      CcccrrR
      OoOCRbB
      --bbbbG
      ---gggg
      -G---b-
      -Y---B-
      ----Y--
      `;
      const board = Board.fromString(boardString, gridRules);
      board.solveChoicelessMoves();
      expect(board.isValidPartial()).toBe(false);
    });
  });
  describe("getValidMovesFrom", () => {
    it("doesn't close off neighboring path", () => {
      const board = Board.fromString(
        dedent`
          ---B
          b--Y
          BY##
          `,
        gridRules
      );
      const moves = board.getValidMovesFrom({ x: 0, y: 1 });
      expect(moves).toMatchObject([
        {
          direction: { dx: 0, dy: -1 },
        },
      ]);
      // Especially, it should not contain {dx: 1, dy: 0}
    });
    it("avoids closing off an area incorrectly", async () => {
      // should grow the g to the left
      const board = Board.fromString(
        dedent`
        Cc--rrR
        O-OCRbB
        -----bG
        ------g
        -G-----
        -Y---B-
        ----Y--
        `,
        gridRules
      );
      expect(
        await board.getValidMovesFrom({
          x: 6,
          y: 3,
        })
      ).toMatchObject([
        {
          direction: {
            dx: -1,
            dy: 0,
          },
        },
      ]);
    });
    it("avoids abandoning an area", async () => {
      // The B in the bottom right should only grow left (not close the bottom right corner off)
      const board = Board.fromString(
        dedent`
        CcccrrR
        OoOCRbB
        --bbbbG
        ---gggg
        -G-----
        -Y---B-
        ----Y--
        `,
        gridRules
      );
      expect(
        await board.getValidMovesFrom({
          x: 5,
          y: 5,
        })
      ).toMatchObject([
        // We allow down here because it's not illegal after just 1 turn;
        // it takes filling the bottom corner to become illegal
        {
          direction: {
            dx: 0,
            dy: 1,
          },
        },
        // This is the correct direction
        {
          direction: {
            dx: -1,
            dy: 0,
          },
        },
      ]);
    });
  });
  describe("solveChoicelessMoves", () => {
    it("solves a complete choiceless board", async () => {
      const board = Board.fromString(
        dedent`
        G-Y---
        R--B--
        -RGO--
        ------
        ------
        OBY---
        `,
        gridRules
      );
      const solution = await board.solveChoicelessMoves();
      expect(solution.toString()).toEqual(dedent`
      GgYyyy
      RggBby
      rRGOby
      ooooby
      obbbby
      OBYyyy
      `);
    });
    it("chooses correctly to not close off an area", async () => {
      // 7x7 level 2
      const board = Board.fromString(
        dedent`
        C-----R
        O-OCR-B
        ------G
        -------
        -G-----
        -Y---B-
        ----Y--
        `,
        gridRules
      );
      const solution = await board.solveChoicelessMoves();
      // TODO: Update once this solves further
      expect(solution.toString()).toEqual(dedent`
      CcccrrR
      OoOCRbB
      --bbbbG
      ---gggg
      -G-----
      -Y---B-
      ----Y--
      `);
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
  describe("solve", () => {
    it("solves a trivial board", async () => {
      const board = Board.fromString(
        dedent`
        B-B
        `,
        gridRules
      );
      expect((await board.solve()).toString()).toEqual(dedent`
      BbB
      `);
    });
    it("solves a board with two colors", async () => {
      const board = Board.fromString(
        dedent`
        Y---
        B-BY
        `,
        gridRules
      );
      expect((await board.solve()).toString()).toEqual(dedent`
      Yyyy
      BbBY
      `);
    });
    it("solves a board with a wrap around", async () => {
      const board = Board.fromString(
        dedent`
        ---
        -B-
        ---
        YBY
        `,
        gridRules
      );
      expect((await board.solve()).toString()).toEqual(dedent`
      yyy
      yBy
      yby
      YBY
      `);
    });
    it("solves a board with a double wrap around", async () => {
      const board = Board.fromString(
        dedent`
        YB---
        ---R-
        -B---
        ---RY
        `,
        gridRules
      );
      expect((await board.solve()).toString()).toEqual(dedent`
      YByyy
      ybyRy
      yByry
      yyyRY
      `);
    });
    it("solves a board with an unintuitive long outer edge", async () => {
      const board = Board.fromString(
        dedent`
        Y---Y
        -BRB-
        -----
        #-R-#
        #---#
        `,
        gridRules
      );
      expect((await board.solve()).toString()).toEqual(dedent`
      YbbbY
      yBRBy
      yyryy
      #yRy#
      #yyy#
      `);
    });
    it("Solves 5x5 level 5", async () => {
      // Level 5 in Classic 5x5
      const board = Board.fromString(
        dedent`
        -----
        -GR-Y
        ----O
        YB-R-
        B-GO-
        `,
        gridRules
      );
      const solution = await board.solve();
      console.log("solution\n" + solution.toString());
      expect(solution).toBeTruthy();
      console.log(solution.toString());
      expect(solution.toString()).toEqual(dedent`
      yyyyy
      yGRrY
      yggrO
      YBgRo
      BbGOo
      `);
    }, 1000);
    it("Solves 5x5 level 30", async () => {
      // Level 5 in Classic 5x5
      const board = Board.fromString(
        dedent`
        B---Y
        -----
        -RG--
        --B--
        GRY--
        `,
        gridRules
      );
      const solution = await board.solve();
      console.log("solution\n" + solution.toString());
      expect(solution).toBeTruthy();
      console.log(solution.toString());
      expect(solution.toString()).toEqual(dedent`
      BbbbY
      gggby
      gRGby
      grBby
      GRYyy
      `);
    }, 1000);
    it("Solves a 6x6", async () => {
      // Level 8 in 6x6 mania
      const board = Board.fromString(
        dedent`
        -----Y
        ---RBG
        --B---
        --G---
        ------
        ----YR
        `,
        gridRules
      );
      const solution = await board.solve();
      console.log("solution\n" + solution.toString());
      expect(solution).toBeTruthy();
      console.log(solution.toString());
      expect(solution.toString()).toEqual(dedent`
      yyyyyY
      yrrRBG
      yrBbbg
      yrGggg
      yrrrrr
      yyyyYR
      `);
    }, 1000);
    it("Solves a 7x7", async () => {
      // Level 1 in 7x7 mania
      // P = Purple
      // K = Pink
      // M = Maroon
      const board = Board.fromString(
        dedent`
        -------
        BY---CG
        OB----R
        --Y----
        -----C-
        ---O-G-
        R------
        `,
        gridRules
      );
      const solution = await board.solve();
      console.log("solution\n" + solution.toString());
      expect(solution).toBeTruthy();
      console.log(solution.toString());
      expect(solution.toString()).toEqual(dedent`
      bbbbggg
      BYybgCG
      OBybgcR
      obYbgcr
      obbbgCr
      oooOgGr
      Rrrrrrr
      `);
    }, 1000);
    it("Solves 8x8 level 1", async () => {
      // Level 1 in 8x8 mania
      // P = Purple
      // K = Pink
      // M = Maroon
      const board = Board.fromString(
        dedent`
        C--CY---
        --RMK-K-
        --B-----
        --G-OM--
        ----M---
        ---R----
        -B-G--OY
        -------M
        `,
        gridRules
      );
      const solution = await board.solve();
      console.log("solution\n" + solution.toString());
      expect(solution).toBeTruthy();
      expect(solution.toString()).toEqual(dedent`
      CccCYyyy
      rrRMKkKy
      rbBmoooy
      rbGmOMoy
      rbgmMmoy
      rbgRrmoy
      rBgGrmOY
      rrrrrmmM
      `);
    }, 1000);
    xit("Solves 8x8 level 3", async () => {
      // Level 1 in 8x8 mania
      // P = Purple
      // K = Pink
      // M = Maroon
      const board = Board.fromString(
        dedent`
        BY-----R
        ------O-
        ----Y---
        -----G--
        --O--B-G
        --R--C--
        ------C-
        --------
        `,
        gridRules
      );
      const solution = await board.solve();
      console.log("solution\n" + solution.toString());
      expect(solution).toBeTruthy();
      expect(solution.toString()).toEqual(dedent`

      `);
    }, 1000);
    xit("Solves a 9x9", async () => {
      // Level 102 in 9x9 mania
      const board = Board.fromString(
        dedent`
        OG-------
        -------O-
        Y-C------
        --R------
        ----BY---
        ------G--
        ------R--
        ------C--
        --------B
        `,
        gridRules
      );
      const solution = await board.solve();
      console.log("solution\n" + solution.toString());
      expect(solution).toBeTruthy();
      console.log(solution.toString());
      expect(solution.toString()).toEqual(`
      OGggggggg
      oooooooOg
      YcCgggggg
      ycRgbbbbb
      ycrgBYyyb
      ycrgggGyb
      ycrrrrRyb
      ycccccCyb
      yyyyyyyyB
      `);
    }, 1000);
    xit("Solves a 10x10", async () => {
      // Level 22 in 10x10 mania
      // P = Purple
      // K = Pink
      // M = Maroon
      const board = Board.fromString(
        dedent`
        ------BKCY
        ----------
        ----------
        ---OP-CG--
        ----------
        ----PG-M--
        ----OR----
        ----M-R-K-
        --------Y-
        ---------B
        `,
        gridRules
      );
      const solution = await board.solve();
      console.log("solution\n" + solution.toString());
      expect(solution).toBeTruthy();
      console.log(solution.toString());
      expect(solution.toString()).toEqual(``);
    }, 1000);
  });
});
