import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { Board } from "../src/Board";
import InteractiveBoard from "../src/components/InteractiveBoard";
import styles from "../styles/Home.module.css";
import { dedent } from "../tests/utils";
import * as gridRules from "../src/gridRules";

const Home: NextPage = () => {
  const board = Board.fromString(
    dedent`
    BYO-O-
    byy,y-
    B##-Y,
  `,
    gridRules
  );
  return (
    <div className={styles.page}>
      <InteractiveBoard
        board={board}
        style={{ width: "1400px", maxWidth: "100vw", maxHeight: "100vh" }}
      />
    </div>
  );
};

export default Home;
