import React, { useState, useEffect, useMemo } from "react";
import { CellValue, MATRIX_SIZE, AbilityType, PoisonZoneDTO } from "@/types/game";
import { getValidWallSet, slotToCenter } from "@/utils/ValidwallPlacements";

const CELL = 56;
const WALL = 12;
const GAP  = 0;
const PAD  = 12;

function cellPx(i: number): number { return PAD + i * (CELL + WALL); }
function zonePx(n: number): number { return n * CELL + (n - 1) * WALL; }

const ZONE_COLS: Partial<Record<AbilityType, number>> = {
  FIREBALL: 2, EARTHQUAKE: 3, POISON: 2, FREEZE: 1,
};
const ZONE_IMAGE: Partial<Record<AbilityType, string>> = {
  FIREBALL:   "/effects/fireball_zone.png",
  EARTHQUAKE: "/effects/earthquake_zone.png",
  POISON:     "/effects/poison_zone.png",
  FREEZE:     "/effects/freeze_zone.png",
};

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
  // boardRow/boardCol are visual coords from the rotated grid.
  // Convert to logical (server) coords before firing callbacks.
  const logR = boardRow;
  const logC = boardCol;
  return (
    <div
      onClick={() => isAbilityMode ? onAbilityClick(logR, logC) : isValidMove && onMove(logR * 2, logC * 2)}
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

function getWallSlots(mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL"): Array<[number, number]> {
  return o === "HORIZONTAL"
    ? [[mr, mc], [mr, mc + 1], [mr, mc + 2]]
    : [[mr, mc], [mr + 1, mc], [mr + 2, mc]];
}

function WallSlot({ orientation, value, mr, mc, isMyTurn, isAbilityMode,
  onWall, onHover, onHoverEnd, isHighlighted, isValid }: {
  orientation: "HORIZONTAL" | "VERTICAL"; value: CellValue; mr: number; mc: number;
  isMyTurn: boolean; isAbilityMode: boolean; isHighlighted: boolean; isValid: boolean;
  onWall:    (mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL") => void;
  onHover:   (mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL") => void;
  onHoverEnd: () => void;
}) {
  const active = value === 3;
  const canPlace = isMyTurn && !active && !isAbilityMode && isValid;
  const isH = orientation === "HORIZONTAL";
  return (
    <div
      onClick={()      => canPlace && onWall(mr, mc, orientation)}
      onMouseEnter={() => canPlace && onHover(mr, mc, orientation)}
      onMouseLeave={() => onHoverEnd()}
      className={`wall-slot ${active ? "active" : ""} ${isHighlighted ? "highlighted" : ""}`}
      style={{
        width: isH ? CELL : WALL, height: isH ? WALL : CELL,
        cursor: isAbilityMode ? "crosshair" : canPlace ? "pointer" : "default",
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

function ZoneRect({ boardRow, boardCol, cols, rows, imageSrc,
  opacity = 0.55, borderColor = "rgba(255,240,100,0.85)",
  animName = "zone-pulse", badge, flipped = false }: {
  boardRow: number; boardCol: number; cols: number; rows: number;
  imageSrc: string; opacity?: number; borderColor?: string;
  animName?: string; badge?: string; flipped?: boolean;
}) {
  const r = Math.min(boardRow, 9 - rows);
  const c = Math.min(boardCol, 9 - cols);
  return (
    <div style={{
      position: "absolute",
      left: cellPx(c), top: cellPx(r),
      width: zonePx(cols), height: zonePx(rows),
      pointerEvents: "none", zIndex: 20,
      borderRadius: 6, overflow: "hidden",
    }}>
      <img src={imageSrc} alt="" style={{
        width: "100%", height: "100%",
        objectFit: "cover", display: "block", opacity,
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
          fontSize: 13, fontWeight: 700, color: "#a0ff60",
          textShadow: "0 0 8px rgba(80,255,0,0.9)",
          transform: flipped ? "rotate(180deg)" : "none",
        }}>{badge}</div>
      )}
    </div>
  );
}

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
  // Chaos mode
  selectedAbilityCard?: AbilityType | null;
  onAbilityTarget?: (boardRow: number, boardCol: number, targetUserId?: number) => void;
  poisonZones?: PoisonZoneDTO[];
  frozenPlayerIds?: number[];
  isFrozen?: boolean;
  // Slots rendered inside the layout by the parent
  chatSlot?: React.ReactNode;
}

export default function QuoridorBoard({
  matrix, isMyTurn, validMoves, onMove, onWall,
  remainingWalls, totalWalls, onForfeit, mySymbol, players,
  selectedAbilityCard = null,
  onAbilityTarget = () => {},
  poisonZones = [],
  frozenPlayerIds = [],
  isFrozen = false,
  chatSlot,
}: QuoridorBoardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const flipped       = mounted && mySymbol === 2;
  const isAbilityMode = !!selectedAbilityCard;

  // Compute valid wall placements once per matrix change (BFS is expensive)
  const validWalls = useMemo(() => getValidWallSet(matrix), [matrix]);

  // Build set of poisoned pawn cells (matrix coords) for quick lookup
  const poisonedCells = useMemo(() => {
    const set = new Set<string>();
    for (const z of poisonZones) {
      for (let dr = 0; dr <= 2; dr += 2)
        for (let dc = 0; dc <= 2; dc += 2)
          set.add(`${z.topLeftRow + dr},${z.topLeftCol + dc}`);
    }
    return set;
  }, [poisonZones]);

  // Filter moves: hide all if frozen, hide poisoned cells
  const effectiveValidMoves = useMemo(() => {
    if (isFrozen) return [];
    return validMoves.filter(([mr, mc]) => !poisonedCells.has(`${mr},${mc}`));
  }, [validMoves, poisonedCells, isFrozen]);

  const [hoveredWall,   setHoveredWall]   = useState<Array<[number, number]>>([]);
  const [hoveredCenter, setHoveredCenter] = useState<{ mr: number; mc: number; o: "HORIZONTAL" | "VERTICAL" } | null>(null);
  const [abilityHover,  setAbilityHover]  = useState<{ r: number; c: number } | null>(null);

  function handleHover(mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL") {
    const [cr, cc] = slotToCenter(mr, mc, o);
    if (!validWalls.has(`${cr},${cc},${o}`)) { setHoveredWall([]); setHoveredCenter(null); return; }
    if (o === "HORIZONTAL") {
      setHoveredWall([[cr, cc - 1], [cr, cc], [cr, cc + 1]]);
      setHoveredCenter({ mr: cr, mc: cc, o });
    } else {
      setHoveredWall([[cr - 1, cc], [cr, cc], [cr + 1, cc]]);
      setHoveredCenter({ mr: cr, mc: cc, o });
    }
  }
  function handleHoverEnd() { setHoveredWall([]); setHoveredCenter(null); }
  function isWallHighlighted(mr: number, mc: number) {
    return hoveredWall.some(([hr, hc]) => hr === mr && hc === mc);
  }

  // Send the wall CENTER (odd,odd) to the backend, converting visual→logical for player 2
  function handleWallClick(_vmr: number, _vmc: number, o: "HORIZONTAL" | "VERTICAL") {
    if (!hoveredCenter || hoveredCenter.o !== o) return;
    onWall(hoveredCenter.mr, hoveredCenter.mc, o);
  }

  function handleAbilityClick(logR: number, logC: number) {
    if (!selectedAbilityCard) return;
    if (selectedAbilityCard === "FREEZE") {
      const cellVal = matrix[logR * 2]?.[logC * 2] ?? 0;
      if (cellVal !== 1 && cellVal !== 2) return;
      const target = players?.find((_, i) => i + 1 === cellVal);
      if (!target) return;
      onAbilityTarget(logR, logC, target.id);
    } else {
      onAbilityTarget(logR, logC);
    }
  }

  // Visual hover coords — used directly for overlay positioning (board-surface is already rotated)
  const hoverVisR = abilityHover?.r ?? null;
  const hoverVisC = abilityHover?.c ?? null;

  // Logical coords — only used when clicking to send to backend
  const hoverLogR = abilityHover ? (flipped ? 8 - abilityHover.r : abilityHover.r) : null;
  const hoverLogC = abilityHover ? (flipped ? 8 - abilityHover.c : abilityHover.c) : null;

  const showHoverZone = hoverVisR !== null && hoverVisC !== null &&
    selectedAbilityCard !== null && (() => {
      if (selectedAbilityCard === "FREEZE") {
        // Check using logical coords since matrix is in logical space
        const v = matrix[hoverLogR! * 2]?.[hoverLogC! * 2] ?? 0;
        return v === 1 || v === 2;
      }
      return true;
    })();

  return (
    <div className="game-layout">

      {/* Sidebar: Players + Forfeit */}
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
          <button onClick={onForfeit} className="forfeit-btn">FORFEIT</button>
        </div>
      </div>

      {/* Board column: board + ability inventory below */}
      <div className="left-column">
        <div className="board-3d-wrapper">
          <style>{`
            @keyframes zone-pulse {
              from { opacity:0.6; border-color: rgba(255,240,100,0.5); }
              to   { opacity:1;   border-color: rgba(255,255,200,1); }
            }
            @keyframes poison-pulse {
              from { opacity:0.5; border-color: rgba(80,255,0,0.4); }
              to   { opacity:1;   border-color: rgba(80,255,0,0.9); }
            }
            @keyframes freeze-pulse {
              from { opacity:0.5; border-color: rgba(100,200,255,0.4); }
              to   { opacity:1;   border-color: rgba(180,240,255,1); }
            }
          `}</style>

          <div
            className="board-surface"
            style={{
              display: "inline-grid",
              gridTemplateColumns: Array.from({ length: MATRIX_SIZE }, (_, i) => i % 2 === 0 ? `${CELL}px` : `${WALL}px`).join(" "),
              gridTemplateRows:    Array.from({ length: MATRIX_SIZE }, (_, i) => i % 2 === 0 ? `${CELL}px` : `${WALL}px`).join(" "),
              gap: GAP,
              transform: flipped ? "rotate(180deg)" : "none",
              position: "relative",
              borderBottom: "none",
            }}
          >
            {Array.from({ length: MATRIX_SIZE }, (_, mr) =>
              Array.from({ length: MATRIX_SIZE }, (_, mc) => {
                const value: CellValue = (matrix[mr]?.[mc] ?? 0) as CellValue;
                const evenRow = mr % 2 === 0;
                const evenCol = mc % 2 === 0;

                if (evenRow && evenCol)
                  return (
                    <PawnCell key={`${mr}-${mc}`}
                      value={value} boardRow={mr / 2} boardCol={mc / 2}
                      isValidMove={effectiveValidMoves.some(([vr, vc]) => vr === mr && vc === mc)}
                      onMove={onMove} flipped={flipped}
                      isAbilityMode={isAbilityMode}
                      onAbilityHover={(r, c) => setAbilityHover({ r, c })}
                      onAbilityLeave={() => setAbilityHover(null)}
                      onAbilityClick={handleAbilityClick}
                    />
                  );
                if (!evenRow && evenCol) {
                  const [hcr, hcc] = slotToCenter(mr, mc, "HORIZONTAL");
                  const hValid = validWalls.has(`${hcr},${hcc},HORIZONTAL`);
                  return <WallSlot key={`${mr}-${mc}`} orientation="HORIZONTAL" value={value}
                    mr={mr} mc={mc} isMyTurn={isMyTurn} isAbilityMode={isAbilityMode}
                    isHighlighted={isWallHighlighted(mr, mc)}
                    isValid={hValid}
                    onWall={handleWallClick} onHover={handleHover} onHoverEnd={handleHoverEnd} />;
                }
                if (evenRow && !evenCol) {
                  const [vcr, vcc] = slotToCenter(mr, mc, "VERTICAL");
                  const vValid = validWalls.has(`${vcr},${vcc},VERTICAL`);
                  return <WallSlot key={`${mr}-${mc}`} orientation="VERTICAL" value={value}
                    mr={mr} mc={mc} isMyTurn={isMyTurn} isAbilityMode={isAbilityMode}
                    isHighlighted={isWallHighlighted(mr, mc)}
                    isValid={vValid}
                    onWall={handleWallClick} onHover={handleHover} onHoverEnd={handleHoverEnd} />;
                }
                return <Pillar key={`${mr}-${mc}`} value={value} isHighlighted={isWallHighlighted(mr, mc)} />;
              })
            )}

            {poisonZones.map((z, i) => (
              <ZoneRect key={`poison-${i}`}
                boardRow={z.topLeftRow / 2} boardCol={z.topLeftCol / 2}
                cols={2} rows={2} imageSrc="/effects/poison_zone.png"
                opacity={0.55} borderColor="rgba(80,255,0,0.7)" animName="poison-pulse"
                badge={String(z.roundsRemaining)}
                flipped={flipped}
              />
            ))}

            {frozenPlayerIds.length > 0 && (() => {
              const els: React.ReactNode[] = [];
              for (let mr = 0; mr < MATRIX_SIZE; mr += 2) {
                for (let mc = 0; mc < MATRIX_SIZE; mc += 2) {
                  const cv = matrix[mr]?.[mc] ?? 0;
                  if (cv !== 1 && cv !== 2) continue;
                  const p = players?.[(cv as number) - 1];
                  if (!p || !frozenPlayerIds.includes(p.id)) continue;
                  els.push(
                    <ZoneRect key={`freeze-${mr}-${mc}`}
                      boardRow={mr / 2} boardCol={mc / 2}
                      cols={1} rows={1} imageSrc="/effects/freeze_zone.png"
                      opacity={0.55} borderColor="rgba(100,210,255,0.9)" animName="freeze-pulse"
                      flipped={flipped}
                    />
                  );
                }
              }
              return els;
            })()}

            {showHoverZone && hoverVisR !== null && hoverVisC !== null &&
              selectedAbilityCard && ZONE_IMAGE[selectedAbilityCard] && (
              <ZoneRect
                boardRow={hoverVisR}
                boardCol={hoverVisC}
                cols={ZONE_COLS[selectedAbilityCard] ?? 1}
                rows={ZONE_COLS[selectedAbilityCard] ?? 1}
                imageSrc={ZONE_IMAGE[selectedAbilityCard]!}
                opacity={0.6} borderColor="rgba(255,240,100,0.85)" animName="zone-pulse"
                flipped={flipped}
              />
            )}
          </div>

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

      </div>

      {/* Chat column */}
      {chatSlot && (
        <div className="chat-column">
          {chatSlot}
        </div>
      )}

    </div>
  );
}