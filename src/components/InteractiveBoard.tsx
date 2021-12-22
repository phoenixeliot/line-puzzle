import clsx from "clsx";
import React, { CSSProperties, useEffect } from "react";
import styles from "../../styles/InteractiveBoard.module.css";
import { Board } from "../Board";
import { Cell } from "../Cell";
import GridCell from "./GridCell";

type BoardData = Array<Array<Cell>>;

const CSS_COLOR_MAP = {
  "-": { textColor: "darkgray", pathColor: "black" },
  "#": { textColor: "black", pathColor: "white" },
  R: { textColor: "white", pathColor: "red" },
  G: { textColor: "white", pathColor: "green" },
  Y: { textColor: "black", pathColor: "yellow" },
  B: { textColor: "white", pathColor: "#22f" }, // #00f is too dark with flux on
  K: { textColor: "white", pathColor: "pink" },
  C: { textColor: "white", pathColor: "cyan" },
  N: { textColor: "white", pathColor: "brown" },
  O: { textColor: "black", pathColor: "orange" },
  P: { textColor: "white", pathColor: "purple" },
};

export default function InteractiveBoard({
  board,
  style = {},
}: {
  board: Board;
  style?: CSSProperties;
}) {
  return (
    <div className={clsx([styles.board, styles.gridBoard])} style={style}>
      {Array.from(board.iterateCells()).map((cell, cellIndex) => {
        let type;
        // TODO: Bake connections into the cell data
        const connections = board.rules
          .getNeighborDirections(cell.position)
          .filter((direction) => {
            const newPos = {
              x: cell.position.x + direction.dx,
              y: cell.position.y + direction.dy,
            };
            return (
              board.isValidPosition(newPos) && board.getCell(newPos).color === cell.color
            );
          });
        return (
          <GridCell
            key={cellIndex}
            cell={cell}
            connections={connections}
            cellText={cell.isEndpoint && cell.color}
            pathColor={CSS_COLOR_MAP[cell.color]?.pathColor}
            textColor={CSS_COLOR_MAP[cell.color]?.textColor}
          />
        );
      })}
    </div>
  );
}
