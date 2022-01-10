import clsx from "clsx";
import React, { CSSProperties, useEffect } from "react";
import styles from "../../styles/InteractiveBoard.module.css";
import { Board, Position } from "../../Board";
import { Cell } from "../../Cell";
import GridCell from "../../components/GridCell";

// TODO in progress: Convert this to use boardReducer for UI state

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
  connectPathWithPushing,
  connectPathToPosition,
  pushColor,
}: {
  board: Board;
  style?: CSSProperties;
  connectPathWithPushing: (pos1: Position, pos2: Position, color: string) => boolean;
  connectPathToPosition: (pos1: Position, pos2: Position, color: string) => boolean;
  pushColor: any;
}) {
  const [useAutoPathing, setUseAutoPathing] = React.useState(false);
  const [usePushMode, setUsePushMode] = React.useState(true);
  const defaultDragState = {
    dragging: false,
    color: null,
    position: null,
    lastPlayablePosition: null,
  };
  const [dragState, setDragState] = React.useState(defaultDragState);
  const startDrag = (event) => {
    const domCell = event.target.closest("[data-cellpos]");
    if (!domCell) return;
    const position = JSON.parse(domCell.getAttribute("data-cellpos"));
    const cell = board.getCell(position);
    setDragState({
      dragging: true,
      color: cell.color,
      position,
      lastPlayablePosition: position,
    });
  };
  const continueDrag = (event) => {
    if (!dragState.dragging) return; // Do nothing if not already dragging
    const prevPosition = dragState.lastPlayablePosition;
    const domCell = event.target.closest("[data-cellpos]");
    if (!domCell) return;
    const newPosition = JSON.parse(domCell.getAttribute("data-cellpos"));
    const cell = board.getCell(newPosition);
    const newState: any = {
      position: newPosition,
    };
    if (cell.color !== dragState.color) {
      // TODO: turn these into reducers or something
      if (useAutoPathing) {
        const success = connectPathWithPushing(
          prevPosition,
          newPosition,
          dragState.color
        );
        console.log(
          `Searching for path from ${JSON.stringify(prevPosition)} to ${JSON.stringify(
            newPosition
          )} with color ${dragState.color}: Success=${success}`
        );
        if (success) {
          newState.lastPlayablePosition = newPosition;
        }
      }
      if (usePushMode) {
        pushColor(newPosition, dragState.color);
        newState.lastPlayablePosition = newPosition;
      }
    }
    setDragState({
      ...dragState,
      ...newState,
    });
  };
  const stopDrag = (event) => {
    setDragState({ ...defaultDragState });
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
