"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import QuoridorBoard from "@/components/QuoridorBoard";
import useLocalStorage from "@/hooks/useLocalStorage";
import { GameDTO, GameState, CellValue, MATRIX_SIZE, AbilityType } from "@/types/game";
import { User } from "@/types/user";
import { useApi } from "@/hooks/useApi";
import { getValidMoves } from "@/utils/validMoves";
import { getApiDomain } from "@/utils/domain";

import "@/styles/gameBoard.css";

// ─── Card assets ──────────────────────────────────────────────────────────────

const CARD_IMAGE: Record<AbilityType, string> = {
  FIREBALL:       "/abilities/fireball.png",
  EARTHQUAKE:     "/abilities/earthquake.png",
  FREEZE:         "/abilities/freeze.png",
  POISON:         "/abilities/poison.png",
  PLUS_TWO_WALLS: "/abilities/walls.png",
  TWO_MOVES:      "/abilities/moves.png",
};

const CARD_NAME: Record<AbilityType, string> = {
  FIREBALL:       "Fireball",
  EARTHQUAKE:     "Earthquake",
  FREEZE:         "Freeze",
  POISON:         "Poison",
  PLUS_TWO_WALLS: "+2 Walls",
  TWO_MOVES:      "2 Moves",
};

const CARD_DESC: Record<AbilityType, string> = {
  FIREBALL:       "Destroys all walls in a 2×2 area.",
  EARTHQUAKE:     "Randomly shifts walls in a 3×3 area.",
  FREEZE:         "Opponent skips their next turn.",
  POISON:         "Marks a 2×2 area impassable for 3 rounds.",
  PLUS_TWO_WALLS: "Instantly gain 2 extra walls.",
  TWO_MOVES:      "Perform 2 actions this turn.",
};

// ─── Animation CSS ────────────────────────────────────────────────────────────

const ANIM_CSS = `
  @keyframes cd-backdrop { from { opacity:0 } to { opacity:1 } }
  @keyframes cd-scene {
    from { transform: translateY(50px) scale(0.8); opacity:0; }
    to   { transform: translateY(0)    scale(1);   opacity:1; }
  }
  @keyframes cd-hint {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes card-shine {
    0%   { transform: translateX(-120%) rotate(25deg); opacity:0; }
    10%  { opacity:1; }
    100% { transform: translateX(320%)  rotate(25deg); opacity:0; }
  }
`;

// ─── Card draw animation ──────────────────────────────────────────────────────
// Phase timeline:
//   0ms     → "dealing"  : card enters screen face-down (cardback)
//   600ms   → "flipping" : 3D flip begins, reveals card front
//   1200ms  → "shining"  : shine sweep plays across front
//   3000ms  → done, onDone() called

function CardDrawAnimation({ cardType, onDone }: {
  cardType: AbilityType | null;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"idle"|"dealing"|"flipping"|"shining">("idle");
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    if (!cardType) { setPhase("idle"); return; }
    // Reset to idle first so re-triggering the same card works
    setPhase("idle");
    const t0 = setTimeout(() => setPhase("dealing"),  20);
    const t1 = setTimeout(() => setPhase("flipping"), 620);
    const t2 = setTimeout(() => setPhase("shining"),  1250);
    const t3 = setTimeout(() => { onDoneRef.current(); }, 3000);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [cardType]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "idle" || !cardType) return null;

  const flipped = phase === "flipping" || phase === "shining";

  return (
    <>
      <style>{ANIM_CSS}</style>

      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 100%)",
        animation: "cd-backdrop 0.35s ease forwards",
      }} />

      {/* Scene */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 24,
        animation: "cd-scene 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
      }}>
        {/* Label */}
        <p style={{
          fontFamily: "'Cinzel','Georgia',serif",
          fontSize: 14, fontWeight: 700, margin: 0,
          letterSpacing: "0.32em", textTransform: "uppercase",
          color: "#d4af37",
          textShadow: "0 0 28px rgba(212,175,55,0.75), 0 0 56px rgba(212,175,55,0.35)",
        }}>
          Card Drawn!
        </p>

        {/* 3-D flip card */}
        <div style={{ perspective: 1000 }}>
          <div style={{
            width: 210, height: 294,
            position: "relative",
            transformStyle: "preserve-3d",
            transition: "transform 0.65s cubic-bezier(0.4,0.2,0.2,1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            filter: phase === "shining"
              ? "drop-shadow(0 0 24px rgba(212,175,55,0.85)) drop-shadow(0 0 48px rgba(212,175,55,0.4))"
              : "drop-shadow(0 16px 32px rgba(0,0,0,0.85))",
          }}>
            {/* Back face */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 14,
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              overflow: "hidden",
            }}>
              <img src="/abilities/cardback.png" alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>

            {/* Front face */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 14,
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              overflow: "hidden",
            }}>
              <img src={CARD_IMAGE[cardType]} alt={CARD_NAME[cardType]}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {/* Shine sweep */}
              {phase === "shining" && (
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)",
                  animation: "card-shine 0.75s ease-out forwards",
                }} />
              )}
            </div>
          </div>
        </div>

        {/* Hint */}
        {flipped && (
          <p style={{
            fontFamily: "'Cinzel','Georgia',serif",
            fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
            color: "rgba(212,175,55,0.65)", margin: 0,
            animation: "cd-hint 0.4s ease 0.2s both",
          }}>
            Added to your inventory
          </p>
        )}
      </div>
    </>
  );
}

// ─── Ability inventory (goes inside the right-column sidebar) ─────────────────

function AbilityInventory({ inventory, selectedCard, onSelectCard, isMyTurn }: {
  inventory: AbilityType[];
  selectedCard: AbilityType | null;
  onSelectCard: (card: AbilityType | null) => void;
  isMyTurn: boolean;
}) {
  return (
    <div className="beam-section" style={{ marginTop: 0 }}>
      <h4>ABILITY CARDS</h4>

      {inventory.length === 0 ? (
        <p style={{ color: "var(--q-text-muted)", fontSize: 11, margin: 0, fontStyle: "italic" }}>
          Draws every 3 rounds.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {inventory.map((cardType, i) => {
            const isSelected = selectedCard === cardType;
            return (
              <button
                key={`${cardType}-${i}`}
                title={`${CARD_NAME[cardType]}: ${CARD_DESC[cardType]}`}
                onClick={() => isMyTurn && onSelectCard(isSelected ? null : cardType)}
                style={{
                  width: 52, height: 73,
                  padding: 0, border: "none", borderRadius: 6,
                  overflow: "hidden", cursor: isMyTurn ? "pointer" : "default",
                  opacity: isMyTurn ? 1 : 0.55,
                  transform: isSelected ? "translateY(-6px) scale(1.1)" : "none",
                  transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, outline 0.1s",
                  boxShadow: isSelected
                    ? "0 8px 20px rgba(0,0,0,0.6), 0 0 14px rgba(212,175,55,0.5)"
                    : "0 3px 8px rgba(0,0,0,0.5)",
                  outline: isSelected ? "2px solid rgba(212,175,55,0.85)" : "none",
                  outlineOffset: 2,
                  background: "transparent",
                  position: "relative",
                }}
              >
                <img src={CARD_IMAGE[cardType]} alt={CARD_NAME[cardType]}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 6 }} />
                {isSelected && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 6,
                    background: "rgba(212,175,55,0.18)", pointerEvents: "none",
                  }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedCard && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 11, color: "var(--q-text-muted)", margin: "0 0 4px", lineHeight: 1.4 }}>
            {CARD_DESC[selectedCard]}
          </p>
          <button
            onClick={() => onSelectCard(null)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--q-title,#c8a44a)", fontSize: 10,
              padding: 0, letterSpacing: "0.08em", textDecoration: "underline",
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export type BoardTheme = "mystic-grove" | "obsidian-keep" | "celestial-sanctum";

function getWsDomain() {
  return getApiDomain().replace(/^https/, "wss").replace(/^http/, "ws");
}

function makeEmptyMatrix(): CellValue[][] {
  return Array.from({ length: MATRIX_SIZE }, () => new Array<CellValue>(MATRIX_SIZE).fill(0));
}

function buildMatrix(dto: GameDTO): CellValue[][] {
  const matrix = makeEmptyMatrix();
  for (const wall of dto.walls ?? []) {
    const { row, col, orientation } = wall;
    if (orientation === "HORIZONTAL") {
      if (matrix[row]) { matrix[row][col-1] = 3; matrix[row][col] = 3; matrix[row][col+1] = 3; }
    } else {
      if (matrix[row-1]) matrix[row-1][col] = 3;
      if (matrix[row])   matrix[row][col]   = 3;
      if (matrix[row+1]) matrix[row+1][col] = 3;
    }
  }
  for (let i = 0; i < (dto.pawns ?? []).length; i++) {
    const { row, col } = dto.pawns[i];
    if (matrix[row]) matrix[row][col] = (i+1) as CellValue;
  }
  return matrix;
}

interface PlayerInfo { id: number; username: string; walls: number; }

const EMPTY_GAME_STATE: GameState = {
  matrix: makeEmptyMatrix(), currentTurnUserId: -1,
  player1Id: -1, player2Id: -1, winnerId: null,
  gameStatus: "WAITING_FOR_USER", wallsPerPlayer: 0,
  remainingWalls: {}, mapTheme: null,
  chaosMode: false, myInventory: [], canDrawCard: false, turnCounter: 0,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { value: token } = useLocalStorage<string>("token", "");
  const { value: userId } = useLocalStorage<number>("userId", -1);

  const [game, setGame]       = useState<GameState>(EMPTY_GAME_STATE);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [error, setError]     = useState<string | null>(null);
  const [banner, setBanner]   = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Card state
  const [drawAnimCard, setDrawAnimCard] = useState<AbilityType | null>(null);
  const [selectedCard, setSelectedCard] = useState<AbilityType | null>(null);
  // Track which turnCounters we've already drawn for
  const drawnTurnsRef = useRef<Set<number>>(new Set());
  const drawingRef    = useRef(false);

  const wsRef   = useRef<WebSocket | null>(null);
  const router  = useRouter();
  const api     = useApi(token);
  const apiRef  = useRef(api);
  useEffect(() => { apiRef.current = api; }, [api]);
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { setMounted(true); }, []);
  const fetchedPlayerIdsRef = useRef<string>("");

  const fetchGame = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const dto = await apiRef.current.get<GameDTO>(`/games/${gameId}`);

      setGame({
        matrix:            buildMatrix(dto),
        currentTurnUserId: dto.currentTurnUserId,
        player1Id:         dto.playerIds?.[0] ?? -1,
        player2Id:         dto.playerIds?.[1] ?? -1,
        winnerId:          dto.winnerId,
        gameStatus:        dto.gameStatus,
        wallsPerPlayer:    dto.wallsPerPlayer,
        remainingWalls:    dto.remainingWalls,
        mapTheme:          dto.mapTheme || "mystic-grove",
        chaosMode:         dto.chaosMode  ?? false,
        myInventory:       dto.myInventory ?? [],
        canDrawCard:       dto.canDrawCard ?? false,
        turnCounter:       dto.turnCounter ?? 0,
      });
      setLastSync(new Date());

      // ── Auto-draw when server says canDrawCard ─────────────────────────────
      if (
        dto.chaosMode &&
        dto.canDrawCard &&
        !drawingRef.current &&
        !drawnTurnsRef.current.has(dto.turnCounter)
      ) {
        drawnTurnsRef.current.add(dto.turnCounter);
        drawingRef.current = true;
        try {
          const drawn = await apiRef.current.post<GameDTO>(`/games/${gameId}/ability/draw`, {});
          const oldInv = dto.myInventory ?? [];
          const newInv = drawn.myInventory ?? [];

          // Diff to find the newly drawn card
          let newCard: AbilityType | null = null;
          const scratch = [...oldInv];
          for (const c of newInv) {
            const idx = scratch.indexOf(c);
            if (idx === -1) { newCard = c; break; }
            scratch.splice(idx, 1);
          }
          if (!newCard && newInv.length > oldInv.length) newCard = newInv[newInv.length - 1];

          // Update inventory in state
          setGame(prev => ({ ...prev, myInventory: newInv, canDrawCard: false }));
          // Trigger animation — set to null first to force re-trigger if same card type
          setDrawAnimCard(null);
          setTimeout(() => { if (newCard) setDrawAnimCard(newCard); }, 50);
        } catch { /* server rejected draw */ }
        finally { drawingRef.current = false; }
      }

      // ── Fetch player names ─────────────────────────────────────────────────
      const idsKey = (dto.playerIds ?? []).join(",");
      if (idsKey && idsKey !== fetchedPlayerIdsRef.current) {
        fetchedPlayerIdsRef.current = idsKey;
        const infos: PlayerInfo[] = [];
        for (const pid of dto.playerIds ?? []) {
          try {
            const u = await apiRef.current.get<User>(`/users/${pid}`);
            infos.push({ id: pid, username: u.displayName || u.username || `Player ${pid}`, walls: dto.remainingWalls?.[String(pid)] ?? 0 });
          } catch { infos.push({ id: pid, username: `Player ${pid}`, walls: 0 }); }
        }
        setPlayers(infos);
      } else {
        setPlayers(prev => prev.map(p => ({ ...p, walls: dto.remainingWalls?.[String(p.id)] ?? 0 })));
      }

      if (dto.gameStatus === "ENDED") router.push(`/games/${gameId}/gameend`);
      setError(null);
    } catch { setError("Could not reach server."); }
  }, [gameId, token, api]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchGame();
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let bannerTimeout:    ReturnType<typeof setTimeout> | undefined;
    let destroyed = false;

    function connect() {
      ws = new WebSocket(`${getWsDomain()}/game-refresh-websocket`);
      wsRef.current = ws;
      ws.onopen = () => {
        setError(null);
        if (!tokenRef.current) return;
        ws.send(JSON.stringify({ type: "REGISTER", gameId: Number(gameId), token: tokenRef.current }));
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type: string; gameId: string | number;
            userId?: string | number; gracePeriodSeconds?: number;
          };
          if (String(msg.gameId) !== String(gameId)) return;
          if (msg.type === "PLAYER_DISCONNECTED") {
            if (Number(msg.userId) !== userId)
              setBanner(`A player disconnected. Waiting ${msg.gracePeriodSeconds ?? 30} seconds for reconnection.`);
          } else if (msg.type === "PLAYER_RECONNECTED") {
            setBanner("The disconnected player reconnected.");
            if (bannerTimeout) clearTimeout(bannerTimeout);
            bannerTimeout = setTimeout(() => setBanner(null), 3000);
          } else if (msg.type === "PLAYER_FORFEITED") {
            setBanner(Number(msg.userId) === userId
              ? "You were removed from the game after not reconnecting in time."
              : "A disconnected player did not return and was removed from the game.");
          } else if (["MOVE","WALL","FORFEIT","GAME_UPDATED","ABILITY_USED","ABILITY_DRAW"].includes(msg.type)) {
            setBanner(null);
          }
          fetchGame();
        } catch { /* ignore */ }
      };
      ws.onerror = () => { setError("WebSocket error — retrying..."); };
      ws.onclose = () => { wsRef.current = null; if (!destroyed) reconnectTimeout = setTimeout(connect, 3000); };
    }
    connect();
    return () => {
      destroyed = true;
      clearTimeout(reconnectTimeout);
      if (bannerTimeout) clearTimeout(bannerTimeout);
      ws?.close();
    };
  }, [gameId, fetchGame, userId]);

  const isMyTurn        = userId !== -1 && game.currentTurnUserId === userId;
  const mySymbol        = (game.player1Id === userId ? 1 : 2) as 1 | 2;
  const validMoves      = isMyTurn ? getValidMoves(game.matrix, mySymbol) : [];
  const myRemainingWalls = game.remainingWalls?.[String(userId)] ?? 0;

  async function handleMove(matrixRow: number, matrixCol: number) {
    if (!isMyTurn) return;
    try { await apiRef.current.post(`/games/${gameId}/move`, { targetField: [matrixRow, matrixCol] }); setSelectedCard(null); fetchGame(); }
    catch { setError("Invalid move."); }
  }

  async function handleWall(matrixRow: number, matrixCol: number, orientation: "HORIZONTAL" | "VERTICAL") {
    if (!isMyTurn) return;
    try {
      const centerRow = orientation === "HORIZONTAL" ? matrixRow : matrixRow + 1;
      const centerCol = orientation === "HORIZONTAL" ? matrixCol + 1 : matrixCol;
      await apiRef.current.post(`/games/${gameId}/wall`, { targetField: [centerRow, centerCol], orientation });
      setSelectedCard(null); fetchGame();
    } catch { setError("Invalid wall placement."); }
  }

  async function handleForfeit() {
    try { await api.post(`/games/${gameId}/forfeit`, {}); }
    catch { setError("Could not forfeit."); }
  }

  // No-target cards fire immediately; targeted cards get selected for board interaction
  async function handleUseCard(cardType: AbilityType) {
    if (!isMyTurn) return;
    if (["PLUS_TWO_WALLS", "TWO_MOVES"].includes(cardType)) {
      try {
        await apiRef.current.post(`/games/${gameId}/ability`, { abilityType: cardType });
        setSelectedCard(null); fetchGame();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Could not use ability."); }
    } else {
      setSelectedCard(prev => prev === cardType ? null : cardType);
    }
  }

  return (
    <main
      className={`theme-${game.mapTheme}`}
      style={{
        minHeight: "100vh",
        background: "var(--q-main-bg)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 20, fontFamily: "system-ui,sans-serif",
        transition: "background 0.3s ease",
      }}
    >
      <h1 style={{ color: "var(--q-title,#c8a44a)", fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: "0.08em" }}>
        QUORIDOR
      </h1>

      {error  && <p style={{ color: "#d96b6b", fontSize: 13 }}>{error}</p>}
      {banner && <p style={{ color: "var(--q-title,#c8a44a)", fontSize: 13 }}>{banner}</p>}
      {game.gameStatus === "ENDED" && (
        <p style={{ color: "var(--q-title,#c8a44a)", fontSize: 15 }}>
          {game.winnerId === userId ? "You win!" : "You lose."}
        </p>
      )}

      {mounted && (
        <QuoridorBoard
          remainingWalls={myRemainingWalls}
          totalWalls={game.wallsPerPlayer}
          mySymbol={mySymbol}
          matrix={game.matrix}
          isMyTurn={isMyTurn}
          validMoves={validMoves}
          onMove={handleMove}
          onWall={handleWall}
          onForfeit={handleForfeit}
          players={players}
          abilityPanel={game.chaosMode ? (
            <AbilityInventory
              inventory={game.myInventory}
              selectedCard={selectedCard}
              onSelectCard={(card) => card ? handleUseCard(card) : setSelectedCard(null)}
              isMyTurn={isMyTurn}
            />
          ) : undefined}
        />
      )}

      {lastSync && (
        <p style={{ color: "var(--q-text-muted,#4a4438)", fontSize: 11, margin: 0 }}>
          last sync {lastSync.toLocaleTimeString()}
        </p>
      )}

      {/* Fullscreen card draw animation */}
      <CardDrawAnimation
        cardType={drawAnimCard}
        onDone={() => setDrawAnimCard(null)}
      />
    </main>
  );
}
