import styles from "../../styles/GridCell.module.css";
import clsx from "clsx";
import { Cell, CellType } from "../Cell";
import {
  EdgesCollection,
  getPositionsFromEdgeId,
  isEqualObj,
  PositionDelta,
} from "../Board";
import React, { CSSProperties } from "react";
import { observer } from "mobx-react-lite";

function pathsFromDeltas(deltas, color) {
  return deltas.map((dir) => {
    const pathString = `M0,0 l${dir.dx},${dir.dy}`;
    return (
      <path
        key={`${dir.dx},${dir.dy}`}
        d={pathString}
        stroke={color}
        strokeLinecap="round"
        strokeWidth="0.66"
        mask="url(#cellMask)"
      />
    );
  });
}

function deltasFromEdges(centerPos, edges) {
  return Object.keys(edges)
    .map((edgeId) => {
      if (!edges[edgeId].connected) return null;

      const positions = getPositionsFromEdgeId(edgeId);
      let otherPos = isEqualObj(centerPos, positions[0]) ? positions[1] : positions[0];
      return { dx: otherPos.x - centerPos.x, dy: otherPos.y - centerPos.y };
    })
    .filter((v) => v);
}

const GridCell = observer(function GridCell({
  cell,
  edges = {},
  pathColor = "#555",
  textColor = "black",
  cellText = "",
}: {
  cell: Cell;
  edges: EdgesCollection;
  pathColor: string;
  textColor?: string;
  cellText?: string;
}) {
  const { position } = cell;
  const type = cell.getType();
  const svgChildren = [];
  const style: CSSProperties = {
    gridArea: `${position.y + 1} / ${position.x + 1} / span 1 / span 1`,
  };
  let wrapperClassName = "";
  // Add any known connections
  svgChildren.push(pathsFromDeltas(deltasFromEdges(position, edges), pathColor));
  if (type === CellType.WALL) {
    wrapperClassName = clsx([styles.gridCell, styles.wall]);
  } else if (type === CellType.EMPTY) {
    wrapperClassName = clsx([styles.gridCell]);
  } else if (type === CellType.LINE_SEGMENT) {
    wrapperClassName = clsx([styles.gridCell]);
  } else if (type === CellType.ENDPOINT) {
    wrapperClassName = clsx([styles.gridCell]);
    // svgChildren.push(pathsFromDeltas(deltasFromEdges(position, edges), pathColor));
    svgChildren.push(
      <path
        key="endpoint"
        d="M0,0 l0,0"
        stroke={pathColor}
        strokeLinecap="round"
        strokeWidth="1.5"
      />
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
        key="text"
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
    <div
      style={style}
      className={wrapperClassName}
      data-cellpos={JSON.stringify(cell.position)}
    >
      <svg
        className={styles.outerSVG}
        viewBox="-1 -1 2 2" // x, y, width, height
        width="1"
        height="1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <mask id="cellMask" maskUnits="userSpaceOnUse">
          <rect x="-1" y="-1" width="2" height="2" fill="white" />
        </mask>
        {svgChildren}
      </svg>
    </div>
  );
});

export default GridCell;
