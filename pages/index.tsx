import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { Board, Position } from "../src/Board";
import InteractiveBoard from "../src/components/InteractiveBoard";
import styles from "../styles/Home.module.css";
import { dedent } from "../tests/utils";
import gridRules from "../src/gridRules";
import React from "react";

import { observer } from "mobx-react-lite";
import { makeAutoObservable, makeObservable, observable, action } from "mobx";

const board = Board.fromString(
  dedent`
  #---#
  O-#-O
  `,
  gridRules
);

const Home: NextPage = () => {
  return (
    <div className={styles.page}>
      <InteractiveBoard
        board={board}
        style={{ height: "400px", maxWidth: "100vw", maxHeight: "100vh" }}
      />
      {/* <button onClick={() => board.solveChoicelessMoves()}>Solve choiceless moves</button> */}
    </div>
  );
};

export default Home;
