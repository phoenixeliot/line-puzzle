import clsx from "clsx";
import React, { CSSProperties, useEffect } from "react";
import styles from "../../styles/InteractiveBoard.module.css";
import { Board, Position } from "../Board";
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
  setColor,
}: {
  board: Board;
  style?: CSSProperties;
  setColor: (position: Position, color: string) => void;
}) {
  const [dragState, setDragState] = React.useState({
    dragging: false,
    color: null,
    position: null,
  });
  const startDrag = (event) => {
    const domCell = event.target.closest("[data-cellpos]");
    if (!domCell) return;
    const position = JSON.parse(domCell.getAttribute("data-cellpos"));
    const cell = board.getCell(position);
    setDragState({
      dragging: true,
      color: cell.color,
      position,
    });
  };
  const continueDrag = (event) => {
    if (!dragState.dragging) return; // Do nothing if not already dragging
    const position = JSON.parse(
      event.target.closest("[data-cellpos]").getAttribute("data-cellpos")
    );
    const cell = board.getCell(position);
    setDragState({
      ...dragState,
      position,
    });
    if (cell.color !== dragState.color) {
      setColor(position, dragState.color);
    }
  };
  const stopDrag = (event) => {
    setDragState({
      dragging: false,
      color: null,
      position: null,
    });
  };
  return (
    <>
      <div
        className={clsx([styles.board, styles.gridBoard])}
        style={style}
        onMouseDown={startDrag}
        onMouseMove={continueDrag}
        onMouseUp={stopDrag}
      >
        {Array.from(board.iterateCells()).map((cell, cellIndex) => {
          // TODO: Bake connections into the cell data
          const connections = board.rules
            .getNeighborDirections(cell.position)
            .filter((direction) => {
              const newPos = {
                x: cell.position.x + direction.dx,
                y: cell.position.y + direction.dy,
              };
              return (
                board.isValidPosition(newPos) &&
                board.getCell(newPos).color === cell.color
              );
            });
          return (
            <GridCell
              key={JSON.stringify(cell.position)}
              cell={cell}
              connections={connections}
              cellText={cell.isEndpoint && cell.color}
              pathColor={CSS_COLOR_MAP[cell.color]?.pathColor}
              textColor={CSS_COLOR_MAP[cell.color]?.textColor}
            />
          );
        })}
      </div>
      <div>dragState: {JSON.stringify(dragState)}</div>
    </>
  );
}
