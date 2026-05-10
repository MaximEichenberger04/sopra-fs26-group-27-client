import React, { useState, useEffect, useMemo } from "react";
import { CellValue, MATRIX_SIZE, WALL_VALUE, AbilityType, PoisonZoneDTO } from "@/types/game";
import { getValidWallSet, slotToCenter } from "@/utils/ValidwallPlacements";

const BASE_CELL = 56;
const BASE_WALL = 12;
const MIN_CELL = 36;
const MAX_CELL = 56;
const PAD = 12;

function cellPx(i: number, cell: number, wall: number): number { return PAD + i * (cell + wall); }
function zonePx(n: number, cell: number, wall: number): number { return n * cell + (n - 1) * wall; }

const ZONE_COLS: Partial<Record<AbilityType, number>> = {
  FIREBALL: 2, EARTHQUAKE: 3, POISON: 2, FREEZE: 1,
};
const ZONE_IMAGE: Partial<Record<AbilityType, string>> = {
  FIREBALL: "/effects/fireball_zone.png",
  EARTHQUAKE: "/effects/earthquake_zone.png",
  POISON: "/effects/poison_zone.png",
  FREEZE: "/effects/freeze_zone.png",
};

const PLAYER_OUTLINE_COLORS: Record<number, string> = {
  1: "rgba(91, 141, 217, 0.9)",
  2: "rgba(217, 107, 107, 0.9)",
  3: "rgba(107, 217, 130, 0.9)",
  4: "rgba(217, 180, 107, 0.9)",
};

// ─── PawnCell ─────────────────────────────────────────────────────────────────

function PawnCell({ value, boardRow, boardCol, isValidMove, onMove, counterRotation,
  cellSize, pawnStyles, isAbilityMode, onAbilityHover, onAbilityLeave, onAbilityClick,
}: {
  value: CellValue; boardRow: number; boardCol: number;
  isValidMove: boolean; onMove: (mr: number, mc: number) => void;
  counterRotation: string; cellSize: number; pawnStyles?: Record<number, string>;
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
        width: cellSize, height: cellSize,
        cursor: isAbilityMode ? "crosshair" : isValidMove ? "pointer" : "default",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {(value >= 1 && value <= 4) && (
        <div
          className={`pawn pawn-${value}`}
          style={{
            width: cellSize * 0.58, height: cellSize * 0.58,
            transform: counterRotation,
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

// ─── WallSlot / Pillar ────────────────────────────────────────────────────────

function getWallSlots(mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL"): Array<[number, number]> {
  return o === "HORIZONTAL"
    ? [[mr, mc], [mr, mc + 1], [mr, mc + 2]]
    : [[mr, mc], [mr + 1, mc], [mr + 2, mc]];
}

function WallSlot({ orientation, value, mr, mc, isMyTurn, isAbilityMode,
  onWall, onHover, onHoverEnd, isHighlighted, isValid, cellSize, wallSize }: {
    orientation: "HORIZONTAL" | "VERTICAL"; value: CellValue; mr: number; mc: number;
    isMyTurn: boolean; isAbilityMode: boolean; isHighlighted: boolean; isValid: boolean;
    cellSize: number; wallSize: number;
    onWall: (mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL") => void;
    onHover: (mr: number, mc: number, o: "HORIZONTAL" | "VERTICAL") => void;
    onHoverEnd: () => void;
  }) {
  const active = value === WALL_VALUE;
  const canPlace = isMyTurn && !active && !isAbilityMode && isValid;
  const isH = orientation === "HORIZONTAL";
  return (
    <div
      onClick={() => canPlace && onWall(mr, mc, orientation)}
      onMouseEnter={() => canPlace && onHover(mr, mc, orientation)}
      onMouseLeave={() => onHoverEnd()}
      className={`wall-slot ${active ? "active" : ""} ${isHighlighted ? "highlighted" : ""}`}
      style={{
        width: isH ? cellSize : wallSize, height: isH ? wallSize : cellSize,
        cursor: isAbilityMode ? "crosshair" : canPlace ? "pointer" : "default",
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

// ─── Zone overlay ─────────────────────────────────────────────────────────────

function ZoneRect({ boardRow, boardCol, cols, rows, imageSrc,
  opacity = 0.55, borderColor = "rgba(255,240,100,0.85)",
  animName = "zone-pulse", badge, counterRotation = "none",
  cellSize, wallSize }: {
    boardRow: number; boardCol: number; cols: number; rows: number;
    imageSrc: string; opacity?: number; borderColor?: string;
    animName?: string; badge?: string; counterRotation?: string;
    cellSize: number; wallSize: number;
  }) {
  const r = Math.min(boardRow, 9 - rows);
  const c = Math.min(boardCol, 9 - cols);
  return (
    <div style={{
      position: "absolute",
      left: cellPx(c, cellSize, wallSize),
      top: cellPx(r, cellSize, wallSize),
      width: zonePx(cols, cellSize, wallSize),
      height: zonePx(rows, cellSize, wallSize),
      pointerEvents: "none", zIndex: 20,
      borderRadius: 6, overflow: "hidden",
    }}>
      <img src={imageSrc} alt="" style={{
        width: "100%", height: "100%",
        objectFit: "cover", display: "block", opacity,
        transform: counterRotation,
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
          transform: counterRotation,
        }}>{badge}</div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

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
  // Chaos mode
  selectedAbilityCard?: AbilityType | null;
  onAbilityTarget?: (boardRow: number, boardCol: number, targetUserId?: number) => void;
  poisonZones?: PoisonZoneDTO[];
  frozenPlayerIds?: number[];
  isFrozen?: boolean;
  chatSlot?: React.ReactNode;
}

// ─── Board ────────────────────────────────────────────────────────────────────

const BOARD_ROTATION: Record<1 | 2 | 3 | 4, number> = {
  1: 0,
  2: 180,
  3: 90,
  4: -90,
};

export default function QuoridorBoard({
  matrix, isMyTurn, validMoves, onMove, onWall, onForfeit,
  mySymbol, players, pawnStyles,
  selectedAbilityCard = null,
  onAbilityTarget = () => { },
  poisonZones = [],
  frozenPlayerIds = [],
  isFrozen = false,
  chatSlot,
}: QuoridorBoardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [showHelp, setShowHelp] = useState(false);

  const boardRotation = mounted ? BOARD_ROTATION[mySymbol] : 0;
  const counterRotation = boardRotation === 0 ? "none" : `rotate(${-boardRotation}deg)`;

  // Responsive cell/wall sizing
  const [sizes, setSizes] = useState({ cell: BASE_CELL, wall: BASE_WALL });
  useEffect(() => {
    function updateSizes() {
      const available = Math.min(window.innerWidth * 0.52, window.innerHeight * 0.72);
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

  const isAbilityMode = !!selectedAbilityCard;

  const validWalls = useMemo(() => getValidWallSet(matrix), [matrix]);

  const poisonedCells = useMemo(() => {
    const set = new Set<string>();
    for (const z of poisonZones)
      for (let dr = 0; dr <= 2; dr += 2)
        for (let dc = 0; dc <= 2; dc += 2)
          set.add(`${z.topLeftRow + dr},${z.topLeftCol + dc}`);
    return set;
  }, [poisonZones]);

  const effectiveValidMoves = useMemo(() => {
    if (isFrozen) return [];
    return validMoves.filter(([mr, mc]) => !poisonedCells.has(`${mr},${mc}`));
  }, [validMoves, poisonedCells, isFrozen]);

  const [hoveredWall, setHoveredWall] = useState<Array<[number, number]>>([]);
  const [hoveredCenter, setHoveredCenter] = useState<{ mr: number; mc: number; o: "HORIZONTAL" | "VERTICAL" } | null>(null);
  const [abilityHover, setAbilityHover] = useState<{ r: number; c: number } | null>(null);

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

  function handleWallClick(_vmr: number, _vmc: number, o: "HORIZONTAL" | "VERTICAL") {
    if (!hoveredCenter || hoveredCenter.o !== o) return;
    onWall(hoveredCenter.mr, hoveredCenter.mc, o);
  }

  function handleAbilityClick(logR: number, logC: number) {
    if (!selectedAbilityCard) return;
    if (selectedAbilityCard === "FREEZE") {
      const cellVal = matrix[logR * 2]?.[logC * 2] ?? 0;
      if (cellVal !== 1 && cellVal !== 2) return;
      const target = players?.find(p => p.symbol === cellVal);
      if (!target) return;
      onAbilityTarget(logR, logC, target.id);
    } else {
      onAbilityTarget(logR, logC);
    }
  }

  const hoverVisR = abilityHover?.r ?? null;
  const hoverVisC = abilityHover?.c ?? null;
  const hoverLogR = abilityHover ? abilityHover.r : null;
  const hoverLogC = abilityHover ? abilityHover.c : null;

  const showHoverZone = hoverVisR !== null && hoverVisC !== null &&
    selectedAbilityCard !== null && (() => {
      if (selectedAbilityCard === "FREEZE") {
        const v = matrix[hoverLogR! * 2]?.[hoverLogC! * 2] ?? 0;
        return v === 1 || v === 2;
      }
      return true;
    })();

  const { cell: CELL, wall: WALL } = sizes;

  return (
    <div className="game-layout">

      {/* Help modal */}
      {showHelp && (
        <div className="help-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={e => e.stopPropagation()}>
            <button className="help-modal-close" onClick={() => setShowHelp(false)}>×</button>
            <h3 className="help-modal-title">How to Play</h3>
            <h4 className="help-modal-subtitle">Classic Mode</h4>
            <p className="help-modal-text">Be the first to move your pawn to the opposite side of the board (top-row).</p>
            <p className="help-modal-text">Each turn, do one of two things:</p>
            <ul className="help-modal-list">
              <li>Move your pawn one square (up, down, left, or right)</li>
              <li>Place a wall to block your opponent&apos;s path</li>
            </ul>
            <p className="help-modal-rule">Wall rule: You can never fully trap a player. Every opponent must always have at least one path to their goal.</p>
            <h4 className="help-modal-subtitle">Chaos Mode</h4>
            <p className="help-modal-text">The same basic rules apply as in Classic Mode.</p>
            <p className="help-modal-text">Each turn, you can either play an ability card, or make a classic action (move/wall).</p>
            <p className="help-modal-text">After every 3 full rounds, draw a random ability card:</p>
            <ul className="help-modal-list">
              <li><strong>Poison:</strong> blocks a 2x2 area for 2 rounds</li>
              <li><strong>Earthquake:</strong> randomly destroys or rotates walls in a 3x3 area</li>
              <li><strong>Fireball:</strong> destroys all walls in a 2x2 area</li>
              <li><strong>Freeze:</strong> skips an opponent&apos;s next turn</li>
              <li><strong>+2 Walls:</strong> gain 2 extra walls</li>
              <li><strong>2 Moves:</strong> take 2 actions this turn</li>
            </ul>
            <p className="help-modal-footer">Think ahead, block smart, and good luck.</p>
          </div>
        </div>
      )}

      {/* Sidebar: Players + Forfeit */}
      <div className="right-column">
        <div className="vertical-beam">
          <button className="help-btn" onClick={() => setShowHelp(true)}>HOW TO PLAY</button>
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

      {/* Board column */}
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
              gridTemplateRows: Array.from({ length: MATRIX_SIZE }, (_, i) => i % 2 === 0 ? `${CELL}px` : `${WALL}px`).join(" "),
              gap: 0,
              transform: `rotate(${boardRotation}deg)`,
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
                      onMove={onMove} counterRotation={counterRotation}
                      cellSize={CELL} pawnStyles={pawnStyles}
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
                    isHighlighted={isWallHighlighted(mr, mc)} isValid={hValid}
                    cellSize={CELL} wallSize={WALL}
                    onWall={handleWallClick} onHover={handleHover} onHoverEnd={handleHoverEnd} />;
                }
                if (evenRow && !evenCol) {
                  const [vcr, vcc] = slotToCenter(mr, mc, "VERTICAL");
                  const vValid = validWalls.has(`${vcr},${vcc},VERTICAL`);
                  return <WallSlot key={`${mr}-${mc}`} orientation="VERTICAL" value={value}
                    mr={mr} mc={mc} isMyTurn={isMyTurn} isAbilityMode={isAbilityMode}
                    isHighlighted={isWallHighlighted(mr, mc)} isValid={vValid}
                    cellSize={CELL} wallSize={WALL}
                    onWall={handleWallClick} onHover={handleHover} onHoverEnd={handleHoverEnd} />;
                }
                return <Pillar key={`${mr}-${mc}`} value={value} isHighlighted={isWallHighlighted(mr, mc)} wallSize={WALL} />;
              })
            )}

            {/* Poison zones */}
            {poisonZones.map((z, i) => (
              <ZoneRect key={`poison-${i}`}
                boardRow={z.topLeftRow / 2} boardCol={z.topLeftCol / 2}
                cols={2} rows={2} imageSrc="/effects/poison_zone.png"
                opacity={0.55} borderColor="rgba(80,255,0,0.7)" animName="poison-pulse"
                badge={String(z.roundsRemaining)} counterRotation={counterRotation}
                cellSize={CELL} wallSize={WALL}
              />
            ))}

            {/* Freeze overlays */}
            {frozenPlayerIds.length > 0 && (() => {
              const els: React.ReactNode[] = [];
              for (let mr = 0; mr < MATRIX_SIZE; mr += 2) {
                for (let mc = 0; mc < MATRIX_SIZE; mc += 2) {
                  const cv = matrix[mr]?.[mc] ?? 0;
                  if (cv !== 1 && cv !== 2) continue;
                  const p = players?.find(p => p.symbol === cv);
                  if (!p || !frozenPlayerIds.includes(p.id)) continue;
                  els.push(
                    <ZoneRect key={`freeze-${mr}-${mc}`}
                      boardRow={mr / 2} boardCol={mc / 2}
                      cols={1} rows={1} imageSrc="/effects/freeze_zone.png"
                      opacity={0.55} borderColor="rgba(100,210,255,0.9)" animName="freeze-pulse"
                      counterRotation={counterRotation} cellSize={CELL} wallSize={WALL}
                    />
                  );
                }
              }
              return els;
            })()}

            {/* Ability hover zone */}
            {showHoverZone && hoverVisR !== null && hoverVisC !== null &&
              selectedAbilityCard && ZONE_IMAGE[selectedAbilityCard] && (
                <ZoneRect
                  boardRow={hoverVisR} boardCol={hoverVisC}
                  cols={ZONE_COLS[selectedAbilityCard] ?? 1}
                  rows={ZONE_COLS[selectedAbilityCard] ?? 1}
                  imageSrc={ZONE_IMAGE[selectedAbilityCard]!}
                  opacity={0.6} borderColor="rgba(255,240,100,0.85)" animName="zone-pulse"
                  counterRotation={counterRotation} cellSize={CELL} wallSize={WALL}
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
        <div className="chat-column" style={{ height: 9 * CELL + 8 * WALL + 26 }}>
          {chatSlot}
        </div>
      )}

    </div>
  );
}
