import { useEffect, useState } from "react";
import { CellValue, MATRIX_SIZE } from "@/types/game";

const CELL = 52;
const WALL = 9;
const GAP  = 0;

const C = {
  cell:         "var(--q-cell,        #2e2a22)",
  cellBorder:   "var(--q-cell-border, #4a4438)",
  cellValid:    "#2a3a1e",
  cellValidBorder: "#6a9a4a",
  wallEmpty:    "var(--q-wall-empty,  #1e1c18)",
  wallActive:   "var(--q-wall-active, #c8a44a)",
  pillarEmpty:  "var(--q-pillar,      #181612)",
  pillarActive: "var(--q-wall-active, #c8a44a)",
  p1:           "var(--q-p1,          #5b8dd9)",
  p2:           "var(--q-p2,          #d96b6b)",
  pawnRing:     "rgba(255,255,255,0.30)",
  pawnShine:    "rgba(255,255,255,0.22)",
  wallHover: "#8a6a28",
};

function PawnCell({
  value, boardRow, boardCol, isValidMove, onMove, isMyPawn, onPawnClick,
}: {
  value: CellValue;
  boardRow: number;
  boardCol: number;
  isValidMove: boolean;
  isMyPawn: boolean;
  onMove: (mr: number, mc: number) => void;
  onPawnClick: () => void;
}) {
  function handleClick() {
    if (isMyPawn) {
      onPawnClick(); // deactivate wall mode when clicking own pawn
      return;
    }
    if (isValidMove) onMove(boardRow * 2, boardCol * 2);
  }

  return (
    <div
      onClick={handleClick}
      style={{
        width: CELL, height: CELL,
        background:  isValidMove ? C.cellValid : C.cell,
        border:      isValidMove
          ? `0.5px solid ${C.cellValidBorder}`
          : `0.5px solid ${C.cellBorder}`,
        borderRadius: 5,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxSizing: "border-box",
        cursor: (isValidMove || isMyPawn) ? "pointer" : "default",
        transition: "background 0.12s, border 0.12s",
      }}
    >
      {(value === 1 || value === 2) && (
        <div style={{ position: "relative", width: CELL * 0.62, height: CELL * 0.62 }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: value === 1 ? C.p1 : C.p2,
            border: `2.5px solid ${C.pawnRing}`,
          }} />
          <div style={{
            position: "absolute",
            top: "14%", left: "16%",
            width: "35%", height: "28%",
            borderRadius: "50%",
            background: C.pawnShine,
            transform: "rotate(-20deg)",
          }} />
        </div>
      )}
    </div>
  );
}
function getWallSlots(mr: number, mc: number, orientation: "HORIZONTAL" | "VERTICAL"): Array<[number, number]> {
  if (orientation === "HORIZONTAL") {
    // extends left-right: [mr, mc], [mr, mc+1], [mr, mc+2]
    return [[mr, mc], [mr, mc + 1], [mr, mc + 2]];
  } else {
    // extends up-down: [mr, mc], [mr+1, mc], [mr+2, mc]
    return [[mr, mc], [mr + 1, mc], [mr + 2, mc]];
  }
}

function WallSlot({ orientation, value, mr, mc, canPlace, onWall, onHover, onHoverEnd, isHighlighted }: {
  orientation: "HORIZONTAL" | "VERTICAL";
  value: CellValue;
  mr: number;
  mc: number;
  canPlace: boolean;
  isHighlighted: boolean;
  onWall: (mr: number, mc: number, orientation: "HORIZONTAL" | "VERTICAL") => void;
  onHover: (mr: number, mc: number, orientation: "HORIZONTAL" | "VERTICAL") => void;
  onHoverEnd: () => void;
}) {
  const active = value === 3;
  const isH = orientation === "HORIZONTAL";
  return (
    <div
      onClick={() => canPlace && !active && onWall(mr, mc, orientation)}
      onMouseEnter={() => canPlace && !active && onHover(mr, mc, orientation)}
      onMouseLeave={() => onHoverEnd()}
      style={{
        width:      isH ? CELL : WALL,
        height:     isH ? WALL : CELL,
        background: active
          ? C.wallActive
          : isHighlighted
            ? C.wallHover
            : C.wallEmpty,
        borderRadius: 2,
        cursor: canPlace && !active ? "pointer" : "default",
        transition: "background 0.08s",
      }}
    />
  );
}

function Pillar({ value, isHighlighted }: { value: CellValue; isHighlighted: boolean }) {
  return (
    <div style={{
      width: WALL, height: WALL,
      background: value === 3
        ? C.pillarActive
        : isHighlighted
          ? C.wallHover
          : C.pillarEmpty,
      borderRadius: 2,
      transition: "background 0.08s",
    }} />
  );
}

interface QuoridorBoardProps {
  matrix: CellValue[][];
  isMyTurn: boolean;
  mySymbol: CellValue;
  validMoves: Array<[number, number]>;
  onMove: (mr: number, mc: number) => void;
  onWall: (mr: number, mc: number, orientation: "HORIZONTAL" | "VERTICAL") => void;
}

export default function QuoridorBoard({ matrix, isMyTurn, mySymbol, validMoves, onMove, onWall }: QuoridorBoardProps) {
  const [hoveredWall, setHoveredWall] = useState<Array<[number, number]>>([]);
  const [wallMode, setWallMode]       = useState(false);
 
  // deactivate wall mode whenever it stops being our turn
  useEffect(() => {
    if (!isMyTurn) setWallMode(false);
  }, [isMyTurn]);
 
  function handleHover(mr: number, mc: number, orientation: "HORIZONTAL" | "VERTICAL") {
    setHoveredWall(getWallSlots(mr, mc, orientation));
  }
 
  function handleHoverEnd() {
    setHoveredWall([]);
  }
 
  function isWallHighlighted(mr: number, mc: number): boolean {
    return hoveredWall.some(([hr, hc]) => hr === mr && hc === mc);
  }
 
  function handlePawnClick() {
    setWallMode(false); // clicking own pawn deactivates wall mode
  }
 
  const canPlaceWall = isMyTurn && wallMode;
 
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Board grid */}
      <div style={{
        display: "inline-grid",
        gridTemplateColumns: Array.from({ length: MATRIX_SIZE }, (_, i) =>
          i % 2 === 0 ? `${CELL}px` : `${WALL}px`
        ).join(" "),
        gridTemplateRows: Array.from({ length: MATRIX_SIZE }, (_, i) =>
          i % 2 === 0 ? `${CELL}px` : `${WALL}px`
        ).join(" "),
        gap: GAP,
        // dim the wall slots when wall mode is off and it's our turn, to hint they're inactive
        opacity: 1,
      }}>
        {Array.from({ length: MATRIX_SIZE }, (_, mr) =>
          Array.from({ length: MATRIX_SIZE }, (_, mc) => {
            const value: CellValue = (matrix[mr]?.[mc] ?? 0) as CellValue;
            const evenRow = mr % 2 === 0;
            const evenCol = mc % 2 === 0;
 
            if (evenRow && evenCol) {
              const isValidMove = !wallMode && validMoves.some(([vr, vc]) => vr === mr && vc === mc);
              const isMyPawn    = value === mySymbol;
              return (
                <PawnCell key={`${mr}-${mc}`} value={value}
                  boardRow={mr / 2} boardCol={mc / 2}
                  isValidMove={isValidMove}
                  isMyPawn={isMyPawn}
                  onMove={onMove}
                  onPawnClick={handlePawnClick} />
              );
            }
 
            if (!evenRow && evenCol)
              return <WallSlot key={`${mr}-${mc}`} orientation="HORIZONTAL" value={value}
                mr={mr} mc={mc} canPlace={canPlaceWall}
                isHighlighted={isWallHighlighted(mr, mc)}
                onWall={onWall} onHover={handleHover} onHoverEnd={handleHoverEnd} />;
 
            if (evenRow && !evenCol)
              return <WallSlot key={`${mr}-${mc}`} orientation="VERTICAL" value={value}
                mr={mr} mc={mc} canPlace={canPlaceWall}
                isHighlighted={isWallHighlighted(mr, mc)}
                onWall={onWall} onHover={handleHover} onHoverEnd={handleHoverEnd} />;
 
            return <Pillar key={`${mr}-${mc}`} value={value}
              isHighlighted={isWallHighlighted(mr, mc)} />;
          })
        )}
      </div>
 
      {/* Wall placement toggle button — bottom right corner */}
      {isMyTurn && (
        <button
          onClick={() => setWallMode(prev => !prev)}
          title={wallMode ? "Wall mode ON — click to switch to move mode" : "Click to place a wall"}
          style={{
            position:   "absolute",
            bottom:     -52,
            right:      0,
            width:      44,
            height:     44,
            borderRadius: "50%",
            border:     wallMode
              ? "2px solid #c8a44a"
              : "2px solid #4a4438",
            background: wallMode
              ? "rgba(200,164,74,0.18)"
              : "rgba(30,28,24,0.85)",
            color:      wallMode ? "#c8a44a" : "#6a5a3a",
            fontSize:   20,
            cursor:     "pointer",
            display:    "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
            boxShadow:  wallMode
              ? "0 0 12px rgba(200,164,74,0.35)"
              : "none",
          }}
        >
          {/* Wall icon — two stacked bars */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="5"  width="16" height="3" rx="1.5" fill="currentColor" />
            <rect x="2" y="12" width="16" height="3" rx="1.5" fill="currentColor" />
          </svg>
        </button>
      )}
 
      {/* Mode label below the button */}
      {isMyTurn && (
        <div style={{
          position:   "absolute",
          bottom:     -72,
          right:      0,
          width:      44,
          textAlign:  "center",
          fontSize:   9,
          letterSpacing: "0.06em",
          color:      wallMode ? "#c8a44a" : "#4a4438",
          transition: "color 0.15s",
          userSelect: "none",
        }}>
          {wallMode ? "WALL" : "MOVE"}
        </div>
      )}
    </div>
  );
}