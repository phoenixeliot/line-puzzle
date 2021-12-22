import styles from "../../styles/GridCell.module.css";
import clsx from "clsx";
import { Cell, CellType } from "../Cell";
import { PositionDelta } from "../Board";
import { CSSProperties } from "react";

function pathsFromConnections(connections, color) {
  return connections.map((dir) => {
    const pathString = `M0,0 l${dir.dx},${dir.dy}`;
    return (
      <path
        key={JSON.stringify(dir)}
        d={pathString}
        stroke={color}
        strokeLinecap="round"
        strokeWidth="0.66"
      />
    );
  });
}

export default function GridCell({
  cell,
  connections = [],
  pathColor,
  textColor = "black",
  cellText = "",
}: {
  cell: Cell;
  connections: Array<PositionDelta>;
  pathColor?: string;
  textColor?: string;
  cellText?: string;
}) {
  const type = cell.type;
  const position = cell.position;
  const OuterSVG = ({ children = null }) => (
    <svg
      className={styles.outerSVG}
      viewBox="-1 -1 2 2" // x, y, width, height
      width="1"
      height="1"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
  const svgChildren = [];
  const style: CSSProperties = {
    gridArea: `${position.y + 1} / ${position.x + 1} / span 1 / span 1`,
  };
  let wrapperClassName = "";
  if (type === CellType.WALL) {
    wrapperClassName = clsx([styles.gridCell, styles.wall]);
  } else if (type === CellType.EMPTY) {
    wrapperClassName = clsx([styles.gridCell]);
  } else if (type === CellType.LINE_SEGMENT) {
    wrapperClassName = clsx([styles.gridCell]);
    svgChildren.push(pathsFromConnections(connections, pathColor));
  } else if (type === CellType.ENDPOINT) {
    wrapperClassName = clsx([styles.gridCell]);
    svgChildren.push(pathsFromConnections(connections, pathColor));
    svgChildren.push(
      <path d="M0,0 l0,0" stroke={pathColor} strokeLinecap="round" strokeWidth="1.5" />
    );
  } else {
    wrapperClassName = clsx([styles.gridCell, styles.error]);
    cellText = "!";
    textColor = "red";
    style.zIndex = 1; // make sure the red outline is visible
  }
  if (cellText) {
    svgChildren.push(
      <text
        className={styles.text}
        fill={textColor}
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {cellText}
      </text>
    );
  }
  return (
    <div style={style} className={wrapperClassName}>
      <OuterSVG>{svgChildren}</OuterSVG>
    </div>
  );
}
