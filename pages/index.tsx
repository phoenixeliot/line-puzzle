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
  ---A-----------
  -B----A-C------
  ----D----------
  ------C----E---
  ----F-----G----
  ---------------
  -----E-D--H----
  ---I------J----
  ---------------
  -B------K------
  -----L----M----
  --L---N--------
  --H-I-K-JM--G--
  O--------------
  N------O----F--
  `,
  undefined,
  {
    A: "#e935c4",
    B: "#152af5",
    C: "#3c8b26",
    D: "#0b189e",
    E: "#75157a",
    F: "#9d8b58",
    G: "#eb8e34",
    H: "#9f9eb9",
    I: "#973530",
    J: "#75f9fe",
    K: "#377e80",
    L: "#74fb4c",
    M: "#ffffff",
    N: "#e8df49",
    O: "#e83423",
  }
  // dedent`
  // OYGB#BGYO
  // ----#----
  // ---------
  // ---------
  // ---------
  // ---------
  // `,
  // dedent`
  // O---O
  // Y---Y
  // B---B
  // `,
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
