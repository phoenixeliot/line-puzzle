import clsx from "clsx";
import React, { CSSProperties, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import styles from "../../styles/InteractiveBoard.module.css";
import { Board, Position } from "../Board";
import { Cell } from "../Cell";
import GridCell from "./GridCell";

type BoardData = Array<Array<Cell>>;

const CSS_COLOR_MAP = {
  "-": { textColor: "darkgray" },
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

const InteractiveBoard = observer(function InteractiveBoard({
  board,
  style = {},
}: {
  board: Board;
  style?: CSSProperties;
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
    console.log("Starting drag!");
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
    // console.log(cell);
    // console.log(cell.color, dragState.color);
    if (cell.color !== dragState.color) {
      // TODO: turn these into reducers or something
      if (useAutoPathing) {
        board.connectPathWithPushing(prevPosition, newPosition, dragState.color);
        // console.log(
        //   `Searching for path from ${JSON.stringify(prevPosition)} to ${JSON.stringify(
        //     newPosition
        //   )} with color ${dragState.color}: Success=${success}`
        // );
        newState.lastPlayablePosition = newPosition;
      } else if (usePushMode) {
        // board.solveChoicelessMoves();
        board.pushColor(prevPosition, newPosition, dragState.color);
        newState.lastPlayablePosition = newPosition;
      } else {
        // TODO: Just set the color and connect the edge. Use this as default while working on other features.
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

  const [autoSolveInterval, setAutoSolveInterval] = React.useState(null);
  const autoSolveSteps = [
    () => board.propagateEdgeConstraints(),
    () => board.connectPathColors(),
  ];
  const toggleAutoSolve = () => {
    if (autoSolveInterval) {
      clearTimeout(autoSolveInterval);
      setAutoSolveInterval(null);
      return;
    }
    let currentStep = 0;
    const doNextAutoSolveStep = () => {
      console.log(currentStep);
      autoSolveSteps[currentStep]();
      currentStep = (currentStep + 1) % autoSolveSteps.length;
      setAutoSolveInterval(setTimeout(doNextAutoSolveStep, 1000));
    };
    doNextAutoSolveStep();
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
          // const connections = board.rules
          //   .getNeighborDirections(cell.position)
          //   .filter((direction) => {
          //     const newPos = {
          //       x: cell.position.x + direction.dx,
          //       y: cell.position.y + direction.dy,
          //     };
          //     return (
          //       board.isValidPosition(newPos) &&
          //       board.getCell(newPos).color === cell.color
          //     );
          //   });
          const edges = board.getNeighborEdges(cell.position);
          return (
            <GridCell
              key={JSON.stringify(cell.position)}
              cell={cell}
              edges={edges}
              cellText={cell.isEndpoint && cell.color}
              pathColor={
                board.colorMap[cell.color] || CSS_COLOR_MAP[cell.color]?.pathColor
              }
              textColor={
                board.colorMap[cell.color] || CSS_COLOR_MAP[cell.color]?.textColor
              }
            />
          );
        })}
      </div>
      <div>dragState: {JSON.stringify(dragState)}</div>
      <button onClick={() => board.solveChoicelessMoves()}>Solve choiceless moves</button>
      <button onClick={() => board.propagateEdgeConstraints()}>
        Propagate edge constraints
      </button>
      <button onClick={toggleAutoSolve}>Toggle auto-solver</button>
      <button onClick={() => board.connectPathColors()}>Connect path colors</button>
      <div>
        <pre>{board.toString()}</pre>
      </div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <pre>
          Data:{"\n"}
          {JSON.stringify(board.data, null, "  ")}
        </pre>
        <pre>
          Cells:{"\n"}
          {JSON.stringify(board.cells, null, "  ")}
        </pre>
        <pre>
          Edges:{"\n"}
          {JSON.stringify(board.edges, null, "  ")}
        </pre>
      </div>
    </>
  );
});

export default InteractiveBoard;
