import React, { useState, useEffect } from "react";
import { CellValue, MATRIX_SIZE, AbilityType, PoisonZoneDTO } from "@/types/game";

const CELL = 56;
const WALL = 12;
const PAD  = 12; // matches board-surface padding in gameBoard.css

// Top-left pixel of a logical board cell (0-8) relative to the inner grid,
// then offset by PAD because board-surface has padding:12px
function cellPx(boardIndex: number): number {
  return PAD + boardIndex * (CELL + WALL);
}

// Pixel span covering N logical cells including walls between them
function zonePx(n: number): number {
  return n * CELL + (n - 1) * WALL;
}

const ZONE_COLS: Partial<Record<AbilityType, number>> = {
  FIREBALL: 2, EARTHQUAKE: 3, POISON: 2, FREEZE: 1,
};
const ZONE_IMAGE: Partial<Record<AbilityType, string>> = {
  FIREBALL:   "/effects/fireball_zone.png",
  EARTHQUAKE: "/effects/earthquake_zone.png",
  POISON:     "/effects/poison_zone.png",
  FREEZE:     "/effects/freeze_zone.png",
};

// ─── PawnCell ─────────────────────────────────────────────────────────────────

function PawnCell({ value, boardRow, boardCol, isValidMove, onMove, flipped,
  isAbilityMode, onAbilityHover, onAbilityLeave, onAbilityClick,
}: {
  value: CellValue; boardRow: number; boardCol: number;
  isValidMove: boolean; onMove: (mr: number, mc: number) => void; flipped: boolean;
  isAbilityMode: boolean;
  onAbilityHover: (r: number, c: number) => void;
  onAbilityLeave: () => void;
  onAbilityClick: (r: number, c: number) => void;
}) {
  return (
    <div
      onClick={() => isAbilityMode ? onAbilityClick(boardRow, boardCol) : isValidMove && onMove(boardRow * 2, boardCol * 2)}
      onMouseEnter={() => isAbilityMode && onAbilityHover(boardRow, boardCol)}
      onMouseLeave={() => isAbilityMode && onAbilityLeave()}
      className={`pawn-cell ${isValidMove && !isAbilityMode ? "valid-move" : ""}`}
      style={{
        width: CELL, height: CELL,
        cursor: isAbilityMode ? "crosshair" : isValidMove ? "pointer" : "default",
        transform: flipped ? "rotate(180deg)" : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {(value === 1 || value === 2) && (
        <div className={`pawn pawn-${value}`} style={{ width: CELL * 0.58, height: CELL * 0.58 }}>
          <div className="pawn-highlight" />
        </div>
      )}
    </div>
  );
}

// ─── WallSlot / Pillar ────────────────────────────────────────────────────────

function getWallSlots(mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL"): Array<[number, number]> {
  return o === "HORIZONTAL"
    ? [[mr, mc], [mr, mc + 1], [mr, mc + 2]]
    : [[mr, mc], [mr + 1, mc], [mr + 2, mc]];
}

function WallSlot({ orientation, value, mr, mc, isMyTurn, isAbilityMode,
  onWall, onHover, onHoverEnd, isHighlighted }: {
  orientation: "HORIZONTAL" | "VERTICAL"; value: CellValue; mr: number; mc: number;
  isMyTurn: boolean; isAbilityMode: boolean; isHighlighted: boolean;
  onWall:    (mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL") => void;
  onHover:   (mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL") => void;
  onHoverEnd: () => void;
}) {
  const active = value === 3;
  const isH    = orientation === "HORIZONTAL";
  return (
    <div
      onClick={()      => !isAbilityMode && isMyTurn && !active && onWall(mr, mc, orientation)}
      onMouseEnter={() => !isAbilityMode && isMyTurn && !active && onHover(mr, mc, orientation)}
      onMouseLeave={() => onHoverEnd()}
      className={`wall-slot ${active ? "active" : ""} ${isHighlighted && !isAbilityMode ? "highlighted" : ""}`}
      style={{
        width: isH ? CELL : WALL, height: isH ? WALL : CELL,
        cursor: isAbilityMode ? "crosshair" : isMyTurn && !active ? "pointer" : "default",
      }}
    />
  );
}

function Pillar({ value, isHighlighted }: { value: CellValue; isHighlighted: boolean }) {
  return (
    <div
      className={`pillar ${value === 3 ? "active" : ""} ${isHighlighted ? "highlighted" : ""}`}
      style={{ width: WALL, height: WALL }}
    />
  );
}

// ─── Zone rect — positioned inside board-surface, offset by PAD ──────────────

function ZoneRect({ boardRow, boardCol, cols, rows, imageSrc, opacity = 0.88,
  borderColor = "rgba(255,240,100,0.85)", animName = "zone-pulse", badge, flipped = false }: {
  boardRow: number; boardCol: number; cols: number; rows: number;
  imageSrc: string; opacity?: number; borderColor?: string;
  animName?: string; badge?: string; flipped?: boolean;
}) {
  const r = Math.min(boardRow, 9 - rows);
  const c = Math.min(boardCol, 9 - cols);

  // Total board pixel size (9 cells + 8 wall slots), excluding padding
  const gridPx = 9 * CELL + 8 * WALL;

  // When flipped: mirror within the padded area.
  // cellPx(x) = PAD + x*(CELL+WALL), so the raw offset without PAD = x*(CELL+WALL)
  const rawOffsetC = c * (CELL + WALL);
  const rawOffsetR = r * (CELL + WALL);

  const left = flipped
    ? PAD + (gridPx - rawOffsetC - zonePx(cols))
    : cellPx(c);
  const top = flipped
    ? PAD + (gridPx - rawOffsetR - zonePx(rows))
    : cellPx(r);

  return (
    <div style={{
      position: "absolute",
      left, top,
      width:  zonePx(cols),
      height: zonePx(rows),
      pointerEvents: "none",
      zIndex: 20,
      borderRadius: 6,
      overflow: "hidden",
    }}>
      <img src={imageSrc} alt="" style={{
        width: "100%", height: "100%",
        objectFit: "cover",
        display: "block",
        opacity,
        filter: "saturate(0.55) brightness(1.1)",
        // Rotate image 180deg for player 2 so it faces the right way
        transform: flipped ? "rotate(180deg)" : "none",
      }} />
      <div style={{
        position: "absolute", inset: 0, borderRadius: 6,
        border: `2.5px solid ${borderColor}`,
        animation: `${animName} 0.9s ease-in-out infinite alternate`,
        pointerEvents: "none",
      }} />
      {badge && (
        <div style={{
          position: "absolute", bottom: 4, right: 6,
          fontFamily: "'Cinzel','Georgia',serif",
          fontSize: 13, fontWeight: 700,
          color: "#a0ff60",
          textShadow: "0 0 8px rgba(80,255,0,0.9)",
        }}>
          {badge}
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerInfo { id: number; username: string; walls: number; }

interface QuoridorBoardProps {
  mySymbol: 1 | 2;
  remainingWalls: number;
  totalWalls: number;
  matrix: CellValue[][];
  isMyTurn: boolean;
  validMoves: Array<[number, number]>;
  onMove:    (mr: number, mc: number) => void;
  onWall:    (mr: number, mc: number, orientation: "HORIZONTAL" | "VERTICAL") => void;
  onForfeit: () => void;
  players?: PlayerInfo[];
  abilityPanel?: React.ReactNode;
  selectedAbilityCard: AbilityType | null;
  onAbilityTarget: (boardRow: number, boardCol: number, targetUserId?: number) => void;
  poisonZones: PoisonZoneDTO[];
  frozenPlayerIds: number[];
}

// ─── Board ────────────────────────────────────────────────────────────────────

export default function QuoridorBoard({
  matrix, isMyTurn, validMoves, onMove, onWall,
  remainingWalls, totalWalls, onForfeit, mySymbol, players, abilityPanel,
  selectedAbilityCard, onAbilityTarget, poisonZones, frozenPlayerIds,
}: QuoridorBoardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const flipped       = mounted && mySymbol === 2;
  const isAbilityMode = !!selectedAbilityCard;

  const [hoveredWall,  setHoveredWall]  = useState<Array<[number, number]>>([]);
  const [abilityHover, setAbilityHover] = useState<{ r: number; c: number } | null>(null);

  function handleWallHover(mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL") {
    setHoveredWall(getWallSlots(mr, mc, o));
  }
  function handleWallHoverEnd() { setHoveredWall([]); }
  function isWallHighlighted(mr: number, mc: number) {
    return hoveredWall.some(([hr, hc]) => hr === mr && hc === mc);
  }

  function handleAbilityClick(r: number, c: number) {
    if (!selectedAbilityCard) return;
    if (selectedAbilityCard === "FREEZE") {
      // Must click on an opponent pawn — resolve which player is standing there
      const cellVal = matrix[r * 2]?.[c * 2] ?? 0;
      if (cellVal !== 1 && cellVal !== 2) return;
      // cellVal 1 = player at index 0, cellVal 2 = player at index 1
      const targetPlayer = players?.find((_, i) => i + 1 === cellVal);
      if (!targetPlayer) return;
      onAbilityTarget(r, c, targetPlayer.id);
    } else {
      onAbilityTarget(r, c);
    }
  }

  // For the hover zone: FREEZE only shows over cells with a pawn
  const hoverZoneVisible = abilityHover !== null && selectedAbilityCard !== null && (() => {
    if (selectedAbilityCard === "FREEZE") {
      const v = matrix[abilityHover.r * 2]?.[abilityHover.c * 2] ?? 0;
      return v === 1 || v === 2;
    }
    return true;
  })();

  return (
    <div className="game-layout">
      <div className="left-column">
        <div className="board-3d-wrapper">

          <style>{`
            @keyframes zone-pulse {
              from { opacity:0.75; border-color: rgba(255,240,100,0.6); }
              to   { opacity:1;    border-color: rgba(255,255,255,1); }
            }
            @keyframes poison-pulse {
              from { opacity:0.6; border-color: rgba(80,255,0,0.4); }
              to   { opacity:1;   border-color: rgba(80,255,0,0.9); }
            }
            @keyframes freeze-pulse {
              from { opacity:0.7; border-color: rgba(100,210,255,0.5); }
              to   { opacity:1;   border-color: rgba(180,240,255,1); }
            }
          `}</style>

          {/* board-surface — let gameBoard.css handle all transforms, never override here */}
          <div className="board-surface" style={{ position: "relative" }}>
            {/* Cell grid — rotated for player 2, overlays compensate below */}
            <div style={{
              display: "inline-grid",
              gridTemplateColumns: Array.from({ length: MATRIX_SIZE }, (_, i) => i % 2 === 0 ? `${CELL}px` : `${WALL}px`).join(" "),
              gridTemplateRows:    Array.from({ length: MATRIX_SIZE }, (_, i) => i % 2 === 0 ? `${CELL}px` : `${WALL}px`).join(" "),
              transform: flipped ? "rotate(180deg)" : "none",
              position: "relative", zIndex: 1,
            }}>
              {Array.from({ length: MATRIX_SIZE }, (_, mr) =>
                Array.from({ length: MATRIX_SIZE }, (_, mc) => {
                  const value: CellValue = (matrix[mr]?.[mc] ?? 0) as CellValue;
                  const evenRow = mr % 2 === 0;
                  const evenCol = mc % 2 === 0;

                  if (evenRow && evenCol)
                    return (
                      <PawnCell key={`${mr}-${mc}`}
                        value={value} boardRow={mr / 2} boardCol={mc / 2}
                        isValidMove={validMoves.some(([vr, vc]) => vr === mr && vc === mc)}
                        onMove={onMove} flipped={flipped}
                        isAbilityMode={isAbilityMode}
                        onAbilityHover={(r, c) => setAbilityHover({ r, c })}
                        onAbilityLeave={() => setAbilityHover(null)}
                        onAbilityClick={handleAbilityClick}
                      />
                    );
                  if (!evenRow && evenCol)
                    return <WallSlot key={`${mr}-${mc}`} orientation="HORIZONTAL" value={value}
                      mr={mr} mc={mc} isMyTurn={isMyTurn} isAbilityMode={isAbilityMode}
                      isHighlighted={isWallHighlighted(mr, mc)}
                      onWall={onWall} onHover={handleWallHover} onHoverEnd={handleWallHoverEnd} />;
                  if (evenRow && !evenCol)
                    return <WallSlot key={`${mr}-${mc}`} orientation="VERTICAL" value={value}
                      mr={mr} mc={mc} isMyTurn={isMyTurn} isAbilityMode={isAbilityMode}
                      isHighlighted={isWallHighlighted(mr, mc)}
                      onWall={onWall} onHover={handleWallHover} onHoverEnd={handleWallHoverEnd} />;
                  return <Pillar key={`${mr}-${mc}`} value={value} isHighlighted={isWallHighlighted(mr, mc)} />;
                })
              )}
            </div>

            {/* Zone overlays — absolute children of board-surface, offset by PAD */}
            {poisonZones.map((z, i) => (
              <ZoneRect key={`poison-${i}`}
                boardRow={z.topLeftRow / 2}
                boardCol={z.topLeftCol / 2}
                cols={2} rows={2}
                imageSrc="/effects/poison_zone.png"
                opacity={0.75}
                borderColor="rgba(80,255,0,0.7)"
                animName="poison-pulse"
                badge={String(z.roundsRemaining)}
                flipped={flipped}
              />
            ))}

            {/* Freeze overlay — shown on the pawn of each frozen player */}
            {frozenPlayerIds.length > 0 && Array.from({ length: MATRIX_SIZE }, (_, mr) =>
              mr % 2 === 0 && Array.from({ length: MATRIX_SIZE }, (_, mc) => {
                if (mc % 2 !== 0) return null;
                const cellVal = matrix[mr]?.[mc] ?? 0;
                if (cellVal !== 1 && cellVal !== 2) return null;
                const player = players?.[(cellVal as number) - 1];
                if (!player || !frozenPlayerIds.includes(player.id)) return null;
                return (
                  <ZoneRect key={`freeze-${mr}-${mc}`}
                    boardRow={mr / 2}
                    boardCol={mc / 2}
                    cols={1} rows={1}
                    imageSrc="/effects/freeze_zone.png"
                    opacity={0.88}
                    borderColor="rgba(100,210,255,0.9)"
                    animName="freeze-pulse"
                    flipped={flipped}
                  />
                );
              })
            )}

            {isAbilityMode && selectedAbilityCard && hoverZoneVisible && abilityHover && ZONE_IMAGE[selectedAbilityCard] && (
              <ZoneRect
                boardRow={abilityHover.r}
                boardCol={abilityHover.c}
                cols={ZONE_COLS[selectedAbilityCard] ?? 1}
                rows={ZONE_COLS[selectedAbilityCard] ?? 1}
                imageSrc={ZONE_IMAGE[selectedAbilityCard]!}
                flipped={flipped}
              />
            )}

          </div>{/* end board-surface */}

          {isAbilityMode && (
            <div style={{
              textAlign: "center", marginTop: 8,
              fontFamily: "'Cinzel','Georgia',serif",
              fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "rgba(212,175,55,0.85)",
              textShadow: "0 0 10px rgba(212,175,55,0.5)",
            }}>
              Click target · ESC to cancel
            </div>
          )}
        </div>

        <div className="horizontal-beam chat-beam disabled-beam">
          <input disabled placeholder="Chat disabled in this mode..." className="chat-input" />
          <button disabled className="chat-btn">GIF</button>
          <button disabled className="chat-btn send-btn">Send</button>
        </div>
      </div>

      <div className="right-column">
        <div className="vertical-beam">
          <div className="beam-section">
            <h4>PLAYERS</h4>
            {players && players.length > 0 ? (
              players.map((p, i) => (
                <div key={p.id} className="player-row">
                  <div className="player-badge">
                    <div className={`pawn-icon pawn-${i + 1}-icon`} />
                    <span className="player-name">{p.username}</span>
                  </div>
                  <span className="player-walls">Walls: {p.walls}</span>
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

          {abilityPanel && (
            <>
              <div className="beam-divider" />
              {abilityPanel}
            </>
          )}

          <div className="beam-divider" />

          <button onClick={onForfeit} className="forfeit-btn">FORFEIT</button>
        </div>
      </div>
    </div>
  );
}