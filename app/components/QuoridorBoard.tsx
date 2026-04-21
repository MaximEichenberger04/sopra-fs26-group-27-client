import { useState, useEffect } from "react";
import { CellValue, MATRIX_SIZE } from "@/types/game";

const CELL = 56;
const WALL = 12;
const GAP = 0;

function PawnCell({ value, boardRow, boardCol, isValidMove, onMove, flipped }: any) {
  return (
    <div
      onClick={() => isValidMove && onMove(boardRow * 2, boardCol * 2)}
      className={`pawn-cell ${isValidMove ? 'valid-move' : ''}`}
      style={{
        width: CELL, height: CELL,
        cursor: isValidMove ? "pointer" : "default",
        transform: flipped ? "rotate(180deg)" : "none",
      }}
    >
      {(value === 1 || value === 2) && (
        <div className={`pawn pawn-${value}`}>
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

function WallSlot({ orientation, value, mr, mc, isMyTurn, onWall, onHover, onHoverEnd, isHighlighted }: any) {
  const active = value === 3;
  const isH = orientation === "HORIZONTAL";
  return (
    <div
      onClick={() => isMyTurn && !active && onWall(mr, mc, orientation)}
      onMouseEnter={() => isMyTurn && !active && onHover(mr, mc, orientation)}
      onMouseLeave={() => onHoverEnd()}
      className={`wall-slot ${active ? 'active' : ''} ${isHighlighted ? 'highlighted' : ''}`}
      style={{
        width: isH ? CELL : WALL,
        height: isH ? WALL : CELL,
        cursor: isMyTurn && !active ? "pointer" : "default",
      }}
    />
  );
}

function Pillar({ value, isHighlighted }: any) {
  return (
    <div
      className={`pillar ${value === 3 ? 'active' : ''} ${isHighlighted ? 'highlighted' : ''}`}
      style={{ width: WALL, height: WALL }}
    />
  );
}

interface QuoridorBoardProps {
  mySymbol: 1 | 2;
  remainingWalls: number;
  totalWalls: number;
  matrix: CellValue[][];
  isMyTurn: boolean;
  validMoves: Array<[number, number]>;
  onMove: (mr: number, mc: number) => void;
  onWall: (mr: number, mc: number, orientation: "HORIZONTAL" | "VERTICAL") => void;
  onForfeit: () => void;
}

export default function QuoridorBoard({
  matrix, isMyTurn, validMoves, onMove, onWall, remainingWalls, totalWalls, onForfeit, mySymbol
}: QuoridorBoardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const flipped = mounted && mySymbol === 2;
  const [hoveredWall, setHoveredWall] = useState<Array<[number, number]>>([]);

  function handleHover(mr: number, mc: number, orientation: "HORIZONTAL" | "VERTICAL") {
    setHoveredWall(getWallSlots(mr, mc, orientation));
  }
  function handleHoverEnd() { setHoveredWall([]); }
  function isWallHighlighted(mr: number, mc: number): boolean {
    return hoveredWall.some(([hr, hc]) => hr === mr && hc === mc);
  }

  return (
    <div className="game-layout">

      {/* LEFT COLUMN: Board + Chat */}
      <div className="left-column">

        {/* The 2.5D Game Board */}
        <div className="board-3d-wrapper">
          <div className="board-surface" style={{
            display: "inline-grid",
            gridTemplateColumns: Array.from({ length: MATRIX_SIZE }, (_, i) => i % 2 === 0 ? `${CELL}px` : `${WALL}px`).join(" "),
            gridTemplateRows: Array.from({ length: MATRIX_SIZE }, (_, i) => i % 2 === 0 ? `${CELL}px` : `${WALL}px`).join(" "),
            gap: GAP,
            transform: mySymbol === 2 ? "rotate(180deg)" : "none",
          }}>
            {Array.from({ length: MATRIX_SIZE }, (_, mr) =>
              Array.from({ length: MATRIX_SIZE }, (_, mc) => {
                const value: CellValue = (matrix[mr]?.[mc] ?? 0) as CellValue;
                const evenRow = mr % 2 === 0;
                const evenCol = mc % 2 === 0;

                if (evenRow && evenCol) {
                  const isValidMove = validMoves.some(([vr, vc]) => vr === mr && vc === mc);
                  return <PawnCell key={`${mr}-${mc}`} value={value} boardRow={mr / 2} boardCol={mc / 2} isValidMove={isValidMove} onMove={onMove} flipped={flipped} />;
                }
                if (!evenRow && evenCol) {
                  return <WallSlot key={`${mr}-${mc}`} orientation="HORIZONTAL" value={value} mr={mr} mc={mc} isMyTurn={isMyTurn} isHighlighted={isWallHighlighted(mr, mc)} onWall={onWall} onHover={handleHover} onHoverEnd={handleHoverEnd} />;
                }
                if (evenRow && !evenCol) {
                  return <WallSlot key={`${mr}-${mc}`} orientation="VERTICAL" value={value} mr={mr} mc={mc} isMyTurn={isMyTurn} isHighlighted={isWallHighlighted(mr, mc)} onWall={onWall} onHover={handleHover} onHoverEnd={handleHoverEnd} />;
                }
                return <Pillar key={`${mr}-${mc}`} value={value} isHighlighted={isWallHighlighted(mr, mc)} />;
              })
            )}
          </div>
        </div>

        {/* Bottom Beam: Disabled Chat */}
        <div className="horizontal-beam chat-beam disabled-beam">
          <input disabled placeholder="Chat disabled in this mode..." className="chat-input" />
          <button disabled className="chat-btn">GIF</button>
          <button disabled className="chat-btn send-btn">Send</button>
        </div>

      </div>

      {/* RIGHT COLUMN: Stats & Actions Beam */}
      <div className="right-column">
        <div className="vertical-beam">

          <div className="beam-section">
            <h4>PLAYERS</h4>
            <div className="player-badge">
              <div className="pawn-icon pawn-1-icon"></div>
              <span>Player 1 {mySymbol === 1 && "(You)"}</span>
            </div>
            <div className="player-badge">
              <div className="pawn-icon pawn-2-icon"></div>
              <span>Player 2 {mySymbol === 2 && "(You)"}</span>
            </div>
          </div>

          <div className="beam-divider"></div>

          <div className="beam-section">
            <h4>WALLS LEFT</h4>
            <div className="walls-counter">
              <span className="walls-current">{remainingWalls}</span>
              <span className="walls-total">/ {totalWalls}</span>
            </div>
          </div>

          <div className="beam-spacer"></div>

          <button onClick={onForfeit} className="forfeit-btn">
            FORFEIT
          </button>
        </div>
      </div>

    </div>
  );
}