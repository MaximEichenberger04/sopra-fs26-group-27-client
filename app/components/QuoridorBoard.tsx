import { useState, useEffect } from "react";
import { CellValue, MATRIX_SIZE, WALL_VALUE } from "@/types/game";

const BASE_CELL = 56;
const BASE_WALL = 12;
const MIN_CELL = 36;
const MAX_CELL = 56;

// Player position outline colors — always visible regardless of pawn skin
const PLAYER_OUTLINE_COLORS: Record<number, string> = {
  1: "rgba(91, 141, 217, 0.9)",   // blue
  2: "rgba(217, 107, 107, 0.9)",  // red
  3: "rgba(107, 217, 130, 0.9)",  // green
  4: "rgba(217, 180, 107, 0.9)",  // yellow
};

function PawnCell({ value, boardRow, boardCol, isValidMove, onMove, flipped, cellSize, pawnStyles }: {
  value: CellValue; boardRow: number; boardCol: number; isValidMove: boolean;
  onMove: (mr: number, mc: number) => void; flipped: boolean; cellSize: number;
  pawnStyles?: Record<number, string>;
}) {
  return (
    <div
      onClick={() => isValidMove && onMove(boardRow * 2, boardCol * 2)}
      className={`pawn-cell ${isValidMove ? "valid-move" : ""}`}
      style={{
        width: cellSize, height: cellSize,
        cursor: isValidMove ? "pointer" : "default",
        transform: flipped ? "rotate(180deg)" : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {(value >= 1 && value <= 4) && (
        <div
          className={`pawn pawn-${value}`}
          style={{
            width: cellSize * 0.58,
            height: cellSize * 0.58,
            ...(pawnStyles?.[value] ? { background: pawnStyles[value] } : {}),
            borderColor: PLAYER_OUTLINE_COLORS[value] || "rgba(255,255,255,0.4)",
          }}
        >
          <div className="pawn-highlight" />
        </div>
      )}
    </div>
  );
}

function getWallSlots(mr: number, mc: number, orientation: "HORIZONTAL" | "VERTICAL"): Array<[number, number]> {
  if (orientation === "HORIZONTAL") return [[mr, mc], [mr, mc + 1], [mr, mc + 2]];
  return [[mr, mc], [mr + 1, mc], [mr + 2, mc]];
}

function WallSlot({ orientation, value, mr, mc, isMyTurn, onWall, onHover, onHoverEnd, isHighlighted, cellSize, wallSize }: {
  orientation: "HORIZONTAL" | "VERTICAL"; value: CellValue; mr: number; mc: number;
  isMyTurn: boolean; isHighlighted: boolean;
  onWall: (mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL") => void;
  onHover: (mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL") => void;
  onHoverEnd: () => void; cellSize: number; wallSize: number;
}) {
  const active = value === WALL_VALUE;
  const isH = orientation === "HORIZONTAL";
  return (
    <div
      onClick={() => isMyTurn && !active && onWall(mr, mc, orientation)}
      onMouseEnter={() => isMyTurn && !active && onHover(mr, mc, orientation)}
      onMouseLeave={() => onHoverEnd()}
      className={`wall-slot ${active ? "active" : ""} ${isHighlighted ? "highlighted" : ""}`}
      style={{
        width: isH ? cellSize : wallSize,
        height: isH ? wallSize : cellSize,
        cursor: isMyTurn && !active ? "pointer" : "default",
      }}
    />
  );
}

function Pillar({ value, isHighlighted, wallSize }: { value: CellValue; isHighlighted: boolean; wallSize: number }) {
  return (
    <div
      className={`pillar ${value === WALL_VALUE ? "active" : ""} ${isHighlighted ? "highlighted" : ""}`}
      style={{ width: wallSize, height: wallSize }}
    />
  );
}

export interface PlayerInfo {
  id: number;
  username: string;
  walls: number;
  symbol: 1 | 2 | 3 | 4;
  hasLeft: boolean;
}

interface QuoridorBoardProps {
  mySymbol: 1 | 2 | 3 | 4;
  matrix: CellValue[][];
  isMyTurn: boolean;
  validMoves: Array<[number, number]>;
  onMove: (mr: number, mc: number) => void;
  onWall: (mr: number, mc: number, orientation: "HORIZONTAL" | "VERTICAL") => void;
  onForfeit: () => void;
  players?: PlayerInfo[];
  pawnStyles?: Record<number, string>;
}

export default function QuoridorBoard({
  matrix, isMyTurn, validMoves, onMove, onWall, onForfeit, mySymbol, players, pawnStyles,
}: QuoridorBoardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const boardRotation: Record<1 | 2 | 3 | 4, string> = {
    1: "rotate(0deg)",
    2: "rotate(180deg)",
    3: "rotate(90deg)",
    4: "rotate(-90deg)",
  };

  const flipped = mounted && (mySymbol === 2 || mySymbol === 3 || mySymbol === 4);
  const [hoveredWall, setHoveredWall] = useState<Array<[number, number]>>([]);
  const [sizes, setSizes] = useState({ cell: BASE_CELL, wall: BASE_WALL });

  useEffect(() => {
    function updateSizes() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const available = Math.min(vw * 0.52, vh * 0.72);
      const wallRatio = BASE_WALL / BASE_CELL;
      const rawCell = Math.floor(available / (9 + 8 * wallRatio));
      const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, rawCell));
      const wall = Math.max(8, Math.round(cell * wallRatio));
      setSizes({ cell, wall });
    }
    updateSizes();
    window.addEventListener("resize", updateSizes);
    return () => window.removeEventListener("resize", updateSizes);
  }, []);

  function handleHover(mr: number, mc: number, orientation: "HORIZONTAL" | "VERTICAL") {
    if (!isMyTurn) return;
    setHoveredWall(getWallSlots(mr, mc, orientation));
  }
  function handleHoverEnd() { setHoveredWall([]); }
  function isWallHighlighted(mr: number, mc: number): boolean {
    return hoveredWall.some(([hr, hc]) => hr === mr && hc === mc);
  }

  return (
    <div className="game-layout">

      {/* LEFT: Players + Forfeit */}
      <div className="right-column">
        <div className="vertical-beam">
          <div className="beam-section">
            <h4>PLAYERS</h4>
            {players && players.length > 0 ? (
              players.map((p) => (
                <div key={p.id} className="player-row">
                  <div className="player-badge">
                    <div
                      className={`pawn-icon pawn-${p.symbol}-icon`}
                      style={pawnStyles?.[p.symbol] ? { background: pawnStyles[p.symbol] } : {}}
                    />
                    <span className={`player-name ${p.hasLeft ? "player-name-left" : ""}`}>{p.username}</span>
                  </div>
                  {p.hasLeft ? (
                    <span className="player-left-note">has left the game</span>
                  ) : (
                    <span className="player-walls">Walls: {p.walls}</span>
                  )}
                </div>
              ))
            ) : (
              <>
                <div className="player-row">
                  <div className="player-badge">
                    <div className="pawn-icon pawn-1-icon" />
                    <span className="player-name">Player 1 {mySymbol === 1 && "(You)"}</span>
                  </div>
                </div>
                <div className="player-row">
                  <div className="player-badge">
                    <div className="pawn-icon pawn-2-icon" />
                    <span className="player-name">Player 2 {mySymbol === 2 && "(You)"}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="beam-spacer" />

          <button onClick={onForfeit} className="forfeit-btn">FORFEIT</button>
        </div>
      </div>

      {/* RIGHT: Board + Chat */}
      <div className="left-column">
        <div className="board-3d-wrapper">
          <div className="board-surface" style={{
            display: "inline-grid",
            gridTemplateColumns: Array.from({ length: MATRIX_SIZE }, (_, i) => i % 2 === 0 ? `${sizes.cell}px` : `${sizes.wall}px`).join(" "),
            gridTemplateRows: Array.from({ length: MATRIX_SIZE }, (_, i) => i % 2 === 0 ? `${sizes.cell}px` : `${sizes.wall}px`).join(" "),
            gap: 0,
            transform: mounted ? boardRotation[mySymbol] : "rotate(0deg)",
          }}>
            {Array.from({ length: MATRIX_SIZE }, (_, mr) =>
              Array.from({ length: MATRIX_SIZE }, (_, mc) => {
                const value: CellValue = (matrix[mr]?.[mc] ?? 0) as CellValue;
                const evenRow = mr % 2 === 0;
                const evenCol = mc % 2 === 0;

                if (evenRow && evenCol) {
                  const isValidMove = validMoves.some(([vr, vc]) => vr === mr && vc === mc);
                  return <PawnCell key={`${mr}-${mc}`} value={value} boardRow={mr / 2} boardCol={mc / 2} isValidMove={isValidMove} onMove={onMove} flipped={flipped} cellSize={sizes.cell} pawnStyles={pawnStyles} />;
                }
                if (!evenRow && evenCol) {
                  return <WallSlot key={`${mr}-${mc}`} orientation="HORIZONTAL" value={value} mr={mr} mc={mc} isMyTurn={isMyTurn} isHighlighted={isWallHighlighted(mr, mc)} onWall={onWall} onHover={handleHover} onHoverEnd={handleHoverEnd} cellSize={sizes.cell} wallSize={sizes.wall} />;
                }
                if (evenRow && !evenCol) {
                  return <WallSlot key={`${mr}-${mc}`} orientation="VERTICAL" value={value} mr={mr} mc={mc} isMyTurn={isMyTurn} isHighlighted={isWallHighlighted(mr, mc)} onWall={onWall} onHover={handleHover} onHoverEnd={handleHoverEnd} cellSize={sizes.cell} wallSize={sizes.wall} />;
                }
                return <Pillar key={`${mr}-${mc}`} value={value} isHighlighted={isWallHighlighted(mr, mc)} wallSize={sizes.wall} />;
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}