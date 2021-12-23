import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { Board, Position } from "../src/Board";
import InteractiveBoard from "../src/components/InteractiveBoard";
import styles from "../styles/Home.module.css";
import { dedent } from "../tests/utils";
import * as gridRules from "../src/gridRules";
import React from "react";

const Home: NextPage = () => {
  const [board, setBoard] = React.useState(
    Board.fromString(
      dedent`
      -----
      -----
      BbbbB
      --Y--
      `,
      gridRules
    )
  );
  // TODO: Figure out a good way to track board state in React/Redux-y way
  const solveChoicelessMoves = () => {
    const newBoard = board.clone();
    newBoard.solveChoicelessMoves();
    setBoard(newBoard);
  };
  const setColor = (position, color) => {
    const newBoard = board.clone();
    newBoard.setColor(position, color);
    setBoard(newBoard);
  };
  const connectPathToPosition = (
    prevPosition: Position,
    newPosition: Position,
    color: string
  ): boolean => {
    const newBoard = board.clone();
    const success = newBoard.connectPathToPosition(prevPosition, newPosition, color);
    if (success) setBoard(newBoard);
    return success;
  };
  const pushColor = (position: Position, color: string): boolean => {
    const newBoard = board.clone();
    const success = newBoard.pushColor(position, color);
    if (success) setBoard(newBoard);
    return success;
  };
  return (
    <div className={styles.page}>
      <InteractiveBoard
        board={board}
        connectPathToPosition={connectPathToPosition}
        pushColor={pushColor}
        style={{ height: "400px", maxWidth: "100vw", maxHeight: "100vh" }}
      />
      <button onClick={solveChoicelessMoves}>Solve choiceless moves</button>
    </div>
  );
};

export default Home;
