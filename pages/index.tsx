import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { Board } from "../src/Board";
import InteractiveBoard from "../src/components/InteractiveBoard";
import styles from "../styles/Home.module.css";
import { dedent } from "../tests/utils";
import * as gridRules from "../src/gridRules";
import React from "react";

const Home: NextPage = () => {
  const [board, setBoard] = React.useState(
    Board.fromString(
      dedent`
      BYO-O-
      byy---
      B##--Y
      `,
      gridRules
    )
  );
  const solveChoicelessMoves = () => {
    const newBoard = board.clone();
    newBoard.solveChoicelessMoves();
    setBoard(newBoard);
  };
  return (
    <div className={styles.page}>
      <InteractiveBoard
        board={board}
        style={{ width: "1400px", maxWidth: "100vw", maxHeight: "100vh" }}
      />
      <button onClick={solveChoicelessMoves}>Solve choiceless moves</button>
    </div>
  );
};

export default Home;
