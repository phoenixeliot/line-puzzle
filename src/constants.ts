import path from "path";
import fs from "fs";

export const WALL = "#";
export const ENDPOINT_COLORS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const PATH_COLORS = "abcdefghijklmnopqrstuvwxyz";
export const COLORS = ENDPOINT_COLORS + PATH_COLORS;
export const EMPTY = "-";

const unicodeDataText = fs.readFileSync(path.resolve(__dirname, "UnicodeData.txt"), "utf8");
const unicodeData = unicodeDataText
  .split("\n")
  .map((line) => {
    const [code, charName] = line.split(";");
    return { code: `0x${code}`, charName };
  })
  .reduce((acc, { code, charName }) => {
    acc[charName] = code;
    return acc;
  }, {});

const specialDirections = [
  {
    name: "HORIZONTAL",
    coords: [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ],
  },
  {
    name: "VERTICAL",
    coords: [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
    ],
  },
];
const singleDirections = [
  { name: "UP", coords: [{ dx: 0, dy: -1 }] },
  { name: "RIGHT", coords: [{ dx: 1, dy: 0 }] },
  { name: "DOWN", coords: [{ dx: 0, dy: 1 }] },
  { name: "LEFT", coords: [{ dx: -1, dy: 0 }] },
];
const doubleDirections = singleDirections
  .map((dir1) => {
    return singleDirections
      .map((dir2) => {
        if (dir1.name === dir2.name) return null;
        return {
          name: `${dir1.name} AND ${dir2.name}`,
          coords: dir1.coords.concat(dir2.coords),
        };
      })
      .filter((v) => v);
  })
  .flat();
const allDirections = specialDirections.concat(singleDirections).concat(doubleDirections);

const boxDrawingChars = allDirections
  .map((direction) => ({
    ...direction,
    charCode: unicodeData[`BOX DRAWINGS LIGHT ${direction.name}`],
    char: String.fromCharCode(unicodeData[`BOX DRAWINGS LIGHT ${direction.name}`]),
  }))
  .filter(({ charCode }) => charCode);
