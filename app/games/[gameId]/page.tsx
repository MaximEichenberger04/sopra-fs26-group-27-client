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
  @keyframes cd-backdrop-in  { from { opacity:0 } to { opacity:1 } }
  @keyframes cd-backdrop-out { from { opacity:1 } to { opacity:0 } }

  @keyframes cd-card-enter {
    from { transform: translateY(80px) scale(0.6); opacity: 0; }
    to   { transform: translateY(0)    scale(1);   opacity: 1; }
  }

  @keyframes cd-label-in {
    from { opacity:0; transform: translateY(-10px); }
    to   { opacity:1; transform: translateY(0); }
  }

  @keyframes cd-hint-in {
    from { opacity:0; transform: translateY(8px); }
    to   { opacity:1; transform: translateY(0); }
  }

  @keyframes card-shine {
    0%   { transform: translateX(-120%) rotate(25deg); opacity: 0; }
    15%  { opacity: 1; }
    100% { transform: translateX(320%)  rotate(25deg); opacity: 0; }
  }

  /* Fly-to-inventory: shrinks and slides up-right into the sidebar */
  @keyframes cd-fly-to-inv {
    0%   { transform: translate(0,    0)    scale(1);    opacity: 1; }
    100% { transform: translate(var(--fly-x), var(--fly-y)) scale(0.18); opacity: 0; }
  }
`;

// ─── Animation phases ─────────────────────────────────────────────────────────
// idle       → nothing shown
// entering   → card rises from below, face-down (cardback)
// flipping   → 3D flip to face-up (front image)
// shining    → shine sweep across revealed face
// revealed   → card sits big in center, "added to inventory" hint shown
// flying     → card shrinks + flies to inventory slot
// done       → hidden, onDone() called → card lands in inventory

type AnimPhase = "idle" | "entering" | "flipping" | "shining" | "revealed" | "flying";

// ─── Card draw animation ──────────────────────────────────────────────────────

function CardDrawAnimation({
  cardType,
  onDone,
  inventorySlotRef,
}: {
  cardType: AbilityType | null;
  onDone: () => void;
  inventorySlotRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [phase, setPhase] = useState<AnimPhase>("idle");
  const [flyVars, setFlyVars] = useState({ x: "0px", y: "0px" });
  const cardRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    if (!cardType) return;

    setPhase("entering");
    const t1 = setTimeout(() => setPhase("flipping"),  670);
    const t2 = setTimeout(() => setPhase("shining"),   1320);
    const t3 = setTimeout(() => setPhase("revealed"),  1780);
    const t4 = setTimeout(() => {
      if (cardRef.current && inventorySlotRef.current) {
        const cardRect = cardRef.current.getBoundingClientRect();
        const slotRect = inventorySlotRef.current.getBoundingClientRect();
        const dx = (slotRect.left + slotRect.width  / 2) - (cardRect.left + cardRect.width  / 2);
        const dy = (slotRect.top  + slotRect.height / 2) - (cardRect.top  + cardRect.height / 2);
        setFlyVars({ x: `${dx}px`, y: `${dy}px` });
      }
      setPhase("flying");
    }, 2550);
    const t5 = setTimeout(() => {
      setPhase("idle");
      onDoneRef.current();
    }, 3150);

    return () => { [t1,t2,t3,t4,t5].forEach(clearTimeout); };
  }, [cardType]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "idle" || !cardType) return null;

  const flipped  = phase === "flipping" || phase === "shining" || phase === "revealed" || phase === "flying";
  const isFlying = phase === "flying";

  return (
    <>
      <style>{ANIM_CSS}</style>

      {/* Backdrop — fades out during fly phase */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 100%)",
        animation: isFlying
          ? "cd-backdrop-out 0.5s ease forwards"
          : "cd-backdrop-in 0.4s ease forwards",
      }} />

      {/* Centered scene */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 20,
      }}>
        {/* "Card Drawn!" label — hidden while flying */}
        {!isFlying && (
          <p style={{
            fontFamily: "'Cinzel','Georgia',serif",
            fontSize: 14, fontWeight: 700, margin: 0,
            letterSpacing: "0.32em", textTransform: "uppercase",
            color: "#d4af37",
            textShadow: "0 0 28px rgba(212,175,55,0.75), 0 0 56px rgba(212,175,55,0.35)",
            animation: "cd-label-in 0.4s ease 0.1s both",
            opacity: isFlying ? 0 : 1,
            transition: "opacity 0.2s",
          }}>
            Card Drawn!
          </p>
        )}

        {/* The card */}
        <div style={{ perspective: 1000 }}>
          <div
            ref={cardRef}
            style={{
              width: 210, height: 294,
              position: "relative",
              transformStyle: "preserve-3d",
              // Flip transition
              transition: isFlying
                ? "none"
                : "transform 0.65s cubic-bezier(0.4,0.2,0.2,1), filter 0.4s ease",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              filter: phase === "shining" || phase === "revealed"
                ? "drop-shadow(0 0 24px rgba(212,175,55,0.85)) drop-shadow(0 0 48px rgba(212,175,55,0.4))"
                : "drop-shadow(0 16px 32px rgba(0,0,0,0.85))",
              // Fly animation overrides everything
              ...(isFlying ? {
                animation: "cd-fly-to-inv 0.55s cubic-bezier(0.4,0,0.6,1) forwards",
                ["--fly-x" as string]: flyVars.x,
                ["--fly-y" as string]: flyVars.y,
              } : {
                animation: phase === "entering"
                  ? "cd-card-enter 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards"
                  : "none",
              }),
            }}
          >
            {/* Card back */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 14,
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              overflow: "hidden",
            }}>
              <img src="/abilities/cardback.png" alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>

            {/* Card front */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 14,
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              overflow: "hidden",
            }}>
              <img src={CARD_IMAGE[cardType]} alt={CARD_NAME[cardType]}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
        {(phase === "revealed") && (
          <p style={{
            fontFamily: "'Cinzel','Georgia',serif",
            fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
            color: "rgba(212,175,55,0.7)", margin: 0,
            animation: "cd-hint-in 0.35s ease both",
          }}>
            Added to your inventory
          </p>
        )}
      </div>
    </>
  );
}

// ─── Ability inventory (lives in the right sidebar) ───────────────────────────

interface AbilityInventoryProps {
  inventory: AbilityType[];
  selectedCard: AbilityType | null;
  onSelectCard: (card: AbilityType | null) => void;
  isMyTurn: boolean;
  // ref to the "landing zone" the fly animation targets (last card slot or the section div)
  landingRef: React.RefObject<HTMLDivElement | null>;
}

function AbilityInventory({ inventory, selectedCard, onSelectCard, isMyTurn, landingRef }: AbilityInventoryProps) {
  return (
    <div className="beam-section" style={{ marginTop: 0 }} ref={landingRef}>
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
                  overflow: "hidden",
                  cursor: isMyTurn ? "pointer" : "default",
                  opacity: isMyTurn ? 1 : 0.55,
                  transform: isSelected ? "translateY(-6px) scale(1.1)" : "none",
                  transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s",
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
  poisonZones: [], frozenPlayerIds: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { value: token } = useLocalStorage<string>("token", "");
  const { value: userId } = useLocalStorage<number>("userId", -1);

  const [game, setGame]         = useState<GameState>(EMPTY_GAME_STATE);
  const [players, setPlayers]   = useState<PlayerInfo[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [banner, setBanner]     = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [mounted, setMounted]   = useState(false);

  // Card animation: which card is currently animating
  const [drawAnimCard, setDrawAnimCard] = useState<AbilityType | null>(null);
  // Incrementing key forces CardDrawAnimation to fully remount each draw
  const [drawKey, setDrawKey] = useState(0);
  // Inventory shows the real list AFTER animation completes
  const [shownInventory, setShownInventory] = useState<AbilityType[]>([]);
  const [selectedCard, setSelectedCard]     = useState<AbilityType | null>(null);

  // Ref to the inventory section — the fly animation targets this
  const inventoryLandingRef = useRef<HTMLDivElement | null>(null);

  const drawnTurnsRef = useRef<Set<number>>(new Set());
  const drawingRef    = useRef(false);
  const pendingInvRef = useRef<AbilityType[]>([]);

  const wsRef  = useRef<WebSocket | null>(null);
  const router = useRouter();
  const api    = useApi(token);
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; }, [api]);
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { setMounted(true); }, []);
  const fetchedPlayerIdsRef = useRef<string>("");

  // Sync shownInventory from game state when no animation is playing
  useEffect(() => {
    if (!drawAnimCard) {
      setShownInventory(game.myInventory);
    }
  }, [game.myInventory, drawAnimCard]);

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
        poisonZones:       dto.poisonZones ?? [],
        frozenPlayerIds:   (dto.frozenPlayerIds ?? []) as number[],
      });
      setLastSync(new Date());

      // ── Player names ───────────────────────────────────────────────────────
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

  // ── Dedicated draw effect ──────────────────────────────────────────────────
  // Watches canDrawCard on game state. Completely separate from fetchGame so
  // the animation plays without any re-render or state update racing against it.
  useEffect(() => {
    if (
      !game.chaosMode ||
      !game.canDrawCard ||
      drawingRef.current ||
      drawnTurnsRef.current.has(game.turnCounter)
    ) return;

    drawnTurnsRef.current.add(game.turnCounter);
    drawingRef.current = true;

    // Snapshot the inventory BEFORE the draw so we can diff it
    const oldInv = game.myInventory;

    apiRef.current.post<GameDTO>(`/games/${gameId}/ability/draw`, {})
      .then(drawn => {
        const newInv = drawn.myInventory ?? [];

        // Find what was added
        let newCard: AbilityType | null = null;
        const scratch = [...oldInv];
        for (const c of newInv) {
          const idx = scratch.indexOf(c);
          if (idx === -1) { newCard = c; break; }
          scratch.splice(idx, 1);
        }
        if (!newCard && newInv.length > oldInv.length) newCard = newInv[newInv.length - 1];

        // Store the new inventory for after the animation, suppress canDrawCard
        pendingInvRef.current = newInv;
        setGame(prev => ({ ...prev, canDrawCard: false }));

        // Trigger animation — bump key to force full remount
        if (newCard) {
          setDrawKey(k => k + 1);
          setDrawAnimCard(newCard);
        }
      })
      .catch(() => { /* server rejected — nothing to show */ })
      .finally(() => { drawingRef.current = false; });

  }, [game.canDrawCard, game.turnCounter]); // eslint-disable-line react-hooks/exhaustive-deps
  function handleAnimDone() {
    setDrawAnimCard(null);
    if (pendingInvRef.current.length > 0) {
      setShownInventory(pendingInvRef.current);
      setGame(prev => ({ ...prev, myInventory: pendingInvRef.current }));
      pendingInvRef.current = [];
    }
  }

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

  const isMyTurn         = userId !== -1 && game.currentTurnUserId === userId;
  const mySymbol         = (game.player1Id === userId ? 1 : 2) as 1 | 2;
  const validMoves       = isMyTurn ? getValidMoves(game.matrix, mySymbol) : [];
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

  // ESC cancels ability targeting
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedCard(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleAbilityTarget(boardRow: number, boardCol: number, targetUserId?: number) {
    if (!selectedCard || !isMyTurn) return;
    try {
      const body: Record<string, unknown> = { abilityType: selectedCard };
      if (selectedCard === "FREEZE" && targetUserId != null) {
        body.targetUserId = targetUserId;
      } else {
        body.targetRow = boardRow;
        body.targetCol = boardCol;
      }
      await apiRef.current.post(`/games/${gameId}/ability`, body);
      setSelectedCard(null);
      fetchGame();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not use ability.");
    }
  }

  async function handleUseCard(cardType: AbilityType) {
    if (!isMyTurn) return;
    // No-target cards fire immediately
    if (["PLUS_TWO_WALLS", "TWO_MOVES"].includes(cardType)) {
      try {
        await apiRef.current.post(`/games/${gameId}/ability`, { abilityType: cardType });
        setSelectedCard(null);
        fetchGame();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Could not use ability."); }
    } else {
      // Targeted cards enter targeting mode on the board
      setSelectedCard(prev => prev === cardType ? null : cardType);
    }
  }

  return (
    <main
      className={`theme-${game.mapTheme}`}
      style={{
        minHeight: "100vh", background: "var(--q-main-bg)",
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
          selectedAbilityCard={selectedCard}
          onAbilityTarget={handleAbilityTarget}
          poisonZones={game.poisonZones}
          frozenPlayerIds={game.frozenPlayerIds}
          abilityPanel={game.chaosMode ? (
            <AbilityInventory
              inventory={shownInventory}
              selectedCard={selectedCard}
              onSelectCard={(card) => card ? handleUseCard(card) : setSelectedCard(null)}
              isMyTurn={isMyTurn}
              landingRef={inventoryLandingRef}
            />
          ) : undefined}
        />
      )}

      {lastSync && (
        <p style={{ color: "var(--q-text-muted,#4a4438)", fontSize: 11, margin: 0 }}>
          last sync {lastSync.toLocaleTimeString()}
        </p>
      )}

      {/* Full-screen card draw animation with fly-to-inventory */}
      <CardDrawAnimation
        key={drawKey}
        cardType={drawAnimCard}
        onDone={handleAnimDone}
        inventorySlotRef={inventoryLandingRef}
      />
    </main>
  );
}