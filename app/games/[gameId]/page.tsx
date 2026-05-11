"use client";

import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import { useParams, useRouter } from "next/navigation";
import QuoridorBoard, { PlayerInfo } from "@/components/QuoridorBoard";
import GameChat from "@/components/GameChat";
import useLocalStorage from "@/hooks/useLocalStorage";
import { GameDTO, GameState, CellValue, MATRIX_SIZE, WALL_VALUE, AbilityType } from "@/types/game";
import { User } from "@/types/user";
import { useApi } from "@/hooks/useApi";
import { getValidMoves } from "@/utils/validMoves";
import { getApiDomain } from "@/utils/domain";

import "@/styles/gameBoard.css";

// ─── Pawn skin gradients ──────────────────────────────────────────────────────

const PAWN_SKIN_GRADIENTS: Record<string, string> = {
  "pawn-lava":    "linear-gradient(135deg, #e04020, #f0a030, #e04020)",
  "pawn-ocean":   "linear-gradient(135deg, #2060b0, #40a0e0, #2060b0)",
  "pawn-galaxy":  "linear-gradient(135deg, #2a1a4a, #6a3a9a, #2a1a4a)",
  "pawn-forest":  "linear-gradient(135deg, #1a4a20, #3a8a30, #1a4a20)",
  "pawn-diamond": "linear-gradient(135deg, #a0c0e0, #e0f0ff, #a0c0e0)",
  "pawn-gold":    "linear-gradient(135deg, #8a7420, #e8d06a, #8a7420)",
  "pawn-void":    "linear-gradient(135deg, #0a0a1a, #2a2a4a, #0a0a1a)",
  "pawn-rose":    "linear-gradient(135deg, #9a3060, #e070a0, #9a3060)",
};

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
  @keyframes cd-fly-to-inv {
    0%   { transform: translate(0, 0) scale(1);    opacity: 1; }
    100% { transform: translate(var(--fly-x), var(--fly-y)) scale(0.18); opacity: 0; }
  }
`;

type AnimPhase = "idle" | "entering" | "flipping" | "shining" | "revealed" | "flying";

// ─── Card draw animation ──────────────────────────────────────────────────────

function CardDrawAnimation({ cardType, onDone, inventorySlotRef }: {
  cardType: AbilityType | null;
  onDone: () => void;
  inventorySlotRef: RefObject<HTMLDivElement | null>;
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
        const cr = cardRef.current.getBoundingClientRect();
        const sr = inventorySlotRef.current.getBoundingClientRect();
        setFlyVars({
          x: `${(sr.left + sr.width / 2) - (cr.left + cr.width / 2)}px`,
          y: `${(sr.top + sr.height / 2) - (cr.top + cr.height / 2)}px`,
        });
      }
      setPhase("flying");
    }, 2550);
    const t5 = setTimeout(() => { setPhase("idle"); onDoneRef.current(); }, 3150);
    return () => { [t1, t2, t3, t4, t5].forEach(clearTimeout); };
  }, [cardType]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "idle" || !cardType) return null;

  const flipped  = ["flipping","shining","revealed","flying"].includes(phase);
  const isFlying = phase === "flying";

  return (
    <>
      <style>{ANIM_CSS}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 100%)",
        animation: isFlying ? "cd-backdrop-out 0.5s ease forwards" : "cd-backdrop-in 0.4s ease forwards",
      }} />
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
      }}>
        {!isFlying && (
          <p style={{
            fontFamily: "'Cinzel','Georgia',serif", fontSize: 14, fontWeight: 700, margin: 0,
            letterSpacing: "0.32em", textTransform: "uppercase", color: "#d4af37",
            textShadow: "0 0 28px rgba(212,175,55,0.75)",
            animation: "cd-label-in 0.4s ease 0.1s both",
          }}>Card Drawn!</p>
        )}
        <div style={{ perspective: 1000 }}>
          <div ref={cardRef} style={{
            width: 210, height: 294, position: "relative", transformStyle: "preserve-3d",
            transition: isFlying ? "none" : "transform 0.65s cubic-bezier(0.4,0.2,0.2,1), filter 0.4s ease",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            filter: ["shining","revealed"].includes(phase)
              ? "drop-shadow(0 0 24px rgba(212,175,55,0.85))"
              : "drop-shadow(0 16px 32px rgba(0,0,0,0.85))",
            ...(isFlying ? {
              animation: "cd-fly-to-inv 0.55s cubic-bezier(0.4,0,0.6,1) forwards",
              ["--fly-x" as string]: flyVars.x,
              ["--fly-y" as string]: flyVars.y,
            } : {
              animation: phase === "entering" ? "cd-card-enter 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
            }),
          }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 14, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", overflow: "hidden" }}>
              <img src="/abilities/cardback.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div style={{ position: "absolute", inset: 0, borderRadius: 14, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", overflow: "hidden" }}>
              <img src={CARD_IMAGE[cardType]} alt={CARD_NAME[cardType]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {phase === "shining" && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)", animation: "card-shine 0.75s ease-out forwards" }} />
              )}
            </div>
          </div>
        </div>
        {phase === "revealed" && (
          <p style={{ fontFamily: "'Cinzel','Georgia',serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,175,55,0.7)", margin: 0, animation: "cd-hint-in 0.35s ease both" }}>
            Added to your inventory
          </p>
        )}
      </div>
    </>
  );
}

// ─── Ability inventory ────────────────────────────────────────────────────────

interface AbilityInventoryProps {
  inventory: AbilityType[];
  selectedCard: AbilityType | null;
  onSelectCard: (card: AbilityType | null) => void;
  isMyTurn: boolean;
  landingRef: RefObject<HTMLDivElement | null>;
}

function AbilityInventory({ inventory, selectedCard, onSelectCard, isMyTurn, landingRef }: AbilityInventoryProps) {
  return (
    <div className="beam-section" style={{ marginTop: 0 }} ref={landingRef}>
      <h4>ABILITY CARDS</h4>
      {inventory.length === 0 ? (
        <p style={{ color: "var(--q-text-muted)", fontSize: 11, margin: 0, fontStyle: "italic" }}>Draws every 3 rounds.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "nowrap", gap: 10, justifyContent: "center" }}>
          {inventory.map((cardType, i) => {
            const isSelected = selectedCard === cardType;
            return (
              <button key={`${cardType}-${i}`} title={`${CARD_NAME[cardType]}: ${CARD_DESC[cardType]}`}
                onClick={() => isMyTurn && onSelectCard(isSelected ? null : cardType)}
                style={{
                  width: 76, height: 106, padding: 0, border: "none", borderRadius: 8, overflow: "hidden",
                  cursor: isMyTurn ? "pointer" : "default", opacity: isMyTurn ? 1 : 0.55,
                  transform: isSelected ? "translateY(-6px) scale(1.1)" : "none",
                  transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s",
                  boxShadow: isSelected ? "0 8px 20px rgba(0,0,0,0.6), 0 0 14px rgba(212,175,55,0.5)" : "0 3px 8px rgba(0,0,0,0.5)",
                  outline: isSelected ? "2px solid rgba(212,175,55,0.85)" : "none", outlineOffset: 2,
                  background: "transparent", position: "relative",
                }}>
                <img src={CARD_IMAGE[cardType]} alt={CARD_NAME[cardType]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 6 }} />
                {isSelected && <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: "rgba(212,175,55,0.18)", pointerEvents: "none" }} />}
              </button>
            );
          })}
        </div>
      )}
      {selectedCard && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 11, color: "var(--q-text-muted)", margin: "0 0 4px", lineHeight: 1.4 }}>{CARD_DESC[selectedCard]}</p>
          <button onClick={() => onSelectCard(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--q-title,#c8a44a)", fontSize: 10, padding: 0, letterSpacing: "0.08em", textDecoration: "underline" }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      if (matrix[row]) {
        matrix[row][col - 1] = WALL_VALUE;
        matrix[row][col]     = WALL_VALUE;
        matrix[row][col + 1] = WALL_VALUE;
      }
    } else {
      if (matrix[row - 1]) matrix[row - 1][col] = WALL_VALUE;
      if (matrix[row])     matrix[row][col]     = WALL_VALUE;
      if (matrix[row + 1]) matrix[row + 1][col] = WALL_VALUE;
    }
  }
  for (const pawn of dto.pawns ?? []) {
    const { row, col, userId } = pawn;
    const playerIndex = (dto.playerIds ?? []).findIndex((id) => id === userId);
    if (playerIndex === -1) continue;
    if (matrix[row]) matrix[row][col] = (playerIndex + 1) as CellValue;
  }
  return matrix;
}

function stripForfeitedPawns(
  matrix: CellValue[][],
  playerIds: number[],
  forfeitedIds: number[]
): CellValue[][] {
  if (forfeitedIds.length === 0) return matrix;
  const symbols = new Set<CellValue>(
    forfeitedIds
      .map((uid) => playerIds.findIndex((id) => id === uid))
      .filter((idx) => idx >= 0)
      .map((idx) => (idx + 1) as CellValue)
  );
  if (symbols.size === 0) return matrix;
  return matrix.map((row) => row.map((cell) => (symbols.has(cell) ? 0 : cell)));
}

const EMPTY_GAME_STATE: GameState = {
  matrix: makeEmptyMatrix(),
  currentTurnUserId: -1,
  playerIds: [],
  winnerId: null,
  gameStatus: "WAITING_FOR_USER",
  wallsPerPlayer: 0,
  remainingWalls: {},
  mapTheme: null,
  chaosMode: false,
  myInventory: [],
  canDrawCard: false,
  turnCounter: 0,
  poisonZones: [],
  frozenPlayerIds: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { value: token } = useLocalStorage<string>("token", "");
  const { value: userId } = useLocalStorage<number>("userId", -1);
  const router = useRouter();

  const [game, setGame]         = useState<GameState>(EMPTY_GAME_STATE);
  const [players, setPlayers]   = useState<PlayerInfo[]>([]);
  const [pawnStyles, setPawnStyles] = useState<Record<number, string>>({});
  const [error, setError]       = useState<string | null>(null);
  const [banner, setBanner]     = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [mounted, setMounted]   = useState(false);
  const [forfeitedPlayerIds, setForfeitedPlayerIds] = useState<number[]>([]);

  const [chatRefreshTrigger, setChatRefreshTrigger] = useState(0);

  // Card animation
  const [drawAnimCard, setDrawAnimCard] = useState<AbilityType | null>(null);
  const [drawKey, setDrawKey]           = useState(0);
  const [shownInventory, setShownInventory] = useState<AbilityType[]>([]);
  const [selectedCard, setSelectedCard]     = useState<AbilityType | null>(null);
  const [boardEffect, setBoardEffect]       = useState<{ type: "fireball" | "earthquake"; targetRow: number; targetCol: number } | null>(null);
  const boardEffectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inventoryLandingRef = useRef<HTMLDivElement | null>(null);
  const drawnTurnsRef       = useRef<Set<number>>(new Set());
  const drawingRef          = useRef(false);
  const pendingInvRef       = useRef<AbilityType[]>([]);

  const wsRef      = useRef<WebSocket | null>(null);
  const api        = useApi(token);
  const apiRef     = useRef(api);
  useEffect(() => { apiRef.current = api; }, [api]);
  const tokenRef   = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { setMounted(true); }, []);

  const playerCountRef  = useRef(0);
  const forfeitedRef    = useRef<number[]>([]);
  const fetchedIdsRef   = useRef<string>("");

  useEffect(() => { playerCountRef.current = game.playerIds?.length ?? 0; }, [game.playerIds]);
  useEffect(() => { forfeitedRef.current = forfeitedPlayerIds; }, [forfeitedPlayerIds]);

  // Sync shownInventory when no animation is playing
  useEffect(() => {
    if (!drawAnimCard) setShownInventory(game.myInventory);
  }, [game.myInventory, drawAnimCard]);

  const fetchGame = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const dto = await apiRef.current.get<GameDTO>(`/games/${gameId}`);

      const strippedMatrix = stripForfeitedPawns(
        buildMatrix(dto),
        dto.playerIds ?? [],
        forfeitedRef.current
      );

      setGame({
        matrix:            strippedMatrix,
        currentTurnUserId: dto.currentTurnUserId,
        playerIds:         dto.playerIds ?? [],
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

      const idsKey = (dto.playerIds ?? []).join(",");
      if (idsKey && idsKey !== fetchedIdsRef.current) {
        fetchedIdsRef.current = idsKey;
        const infos: PlayerInfo[] = [];
        const skinStyles: Record<number, string> = {};
        for (const pid of dto.playerIds ?? []) {
          const symbol = ((dto.playerIds ?? []).findIndex((id) => id === pid) + 1) as 1 | 2 | 3 | 4;
          try {
            const u = await apiRef.current.get<User>(`/users/${pid}`);
            infos.push({
              id: pid,
              username: u.displayName || u.username || `Player ${pid}`,
              walls: dto.remainingWalls?.[String(pid)] ?? 0,
              symbol,
              hasLeft: forfeitedRef.current.includes(pid),
            });
            if (u.equippedPawnSkin && PAWN_SKIN_GRADIENTS[u.equippedPawnSkin]) {
              skinStyles[symbol] = PAWN_SKIN_GRADIENTS[u.equippedPawnSkin];
            }
          } catch {
            infos.push({ id: pid, username: `Player ${pid}`, walls: 0, symbol, hasLeft: forfeitedRef.current.includes(pid) });
          }
        }
        setPlayers(infos);
        setPawnStyles(skinStyles);
      } else {
        setPlayers(prev => prev.map(p => ({
          ...p,
          walls: dto.remainingWalls?.[String(p.id)] ?? 0,
          hasLeft: forfeitedRef.current.includes(p.id),
        })));
      }

      if (dto.gameStatus === "ENDED") router.push(`/games/${gameId}/gameend`);
      setError(null);
    } catch {
      setError("Could not reach server.");
    }
  }, [gameId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dedicated draw effect ──────────────────────────────────────────────────
  useEffect(() => {
    if (!game.chaosMode || !game.canDrawCard || drawingRef.current || drawnTurnsRef.current.has(game.turnCounter)) return;
    drawnTurnsRef.current.add(game.turnCounter);
    drawingRef.current = true;
    const oldInv = game.myInventory;
    apiRef.current.post<GameDTO>(`/games/${gameId}/ability/draw`, {})
      .then(drawn => {
        const newInv = drawn.myInventory ?? [];
        let newCard: AbilityType | null = null;
        const scratch = [...oldInv];
        for (const c of newInv) {
          const idx = scratch.indexOf(c);
          if (idx === -1) { newCard = c; break; }
          scratch.splice(idx, 1);
        }
        if (!newCard && newInv.length > oldInv.length) newCard = newInv[newInv.length - 1];
        pendingInvRef.current = newInv;
        setGame(prev => ({ ...prev, canDrawCard: false }));
        if (newCard) { setDrawKey(k => k + 1); setDrawAnimCard(newCard); }
      })
      .catch(() => {})
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

          if (msg.type === "CHAT") { setChatRefreshTrigger(n => n + 1); return; }

          if (msg.type === "PLAYER_DISCONNECTED") {
            if (Number(msg.userId) !== userId)
              setBanner(`A player disconnected. Waiting ${msg.gracePeriodSeconds ?? 30}s for reconnection.`);
          } else if (msg.type === "PLAYER_RECONNECTED") {
            setBanner("The disconnected player reconnected.");
            if (bannerTimeout) clearTimeout(bannerTimeout);
            bannerTimeout = setTimeout(() => setBanner(null), 3000);
          } else if (msg.type === "PLAYER_FORFEITED") {
            const fid = Number(msg.userId);
            if (!Number.isNaN(fid)) {
              setForfeitedPlayerIds(prev => prev.includes(fid) ? prev : [...prev, fid]);
            }
            if (fid === userId) {
              if (playerCountRef.current === 4) { router.push("/users"); return; }
              setBanner("You forfeited the game.");
            } else {
              setBanner("A player forfeited and left the game.");
            }
          } else if (msg.type === "FIREBALL" || msg.type === "EARTHQUAKE") {
            const m = msg as typeof msg & { targetRow?: number; targetCol?: number };
            setBoardEffect({ type: msg.type.toLowerCase() as "fireball" | "earthquake", targetRow: m.targetRow ?? 0, targetCol: m.targetCol ?? 0 });
            if (boardEffectTimerRef.current) clearTimeout(boardEffectTimerRef.current);
            boardEffectTimerRef.current = setTimeout(() => setBoardEffect(null), 1000);
            setBanner(null);
          } else if (["MOVE","WALL","FORFEIT","GAME_UPDATED","ABILITY_USED","ABILITY_DRAW","SKIP"].includes(msg.type)) {
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
  }, [gameId, fetchGame, userId, router]);

  const username = players.find(p => p.id === userId)?.username ?? "";

  const isMyTurn      = userId !== -1 && game.currentTurnUserId === userId;
  const myPlayerIndex = game.playerIds.findIndex((id) => id === userId);
  const mySymbol      = (myPlayerIndex >= 0 ? myPlayerIndex + 1 : 1) as 1 | 2 | 3 | 4;
  const validMoves    = isMyTurn ? getValidMoves(game.matrix, mySymbol) : [];

  async function handleMove(matrixRow: number, matrixCol: number) {
    if (!isMyTurn) return;
    try { await apiRef.current.post(`/games/${gameId}/move`, { targetField: [matrixRow, matrixCol] }); setSelectedCard(null); fetchGame(); }
    catch { setError("Invalid move."); }
  }

  async function handleWall(centerRow: number, centerCol: number, orientation: "HORIZONTAL" | "VERTICAL") {
    if (!isMyTurn) return;
    try {
      await apiRef.current.post(`/games/${gameId}/wall`, { targetField: [centerRow, centerCol], orientation });
      setSelectedCard(null); fetchGame();
    } catch { setError("Invalid wall placement."); }
  }

  async function handleForfeit() {
    try {
      await api.post(`/games/${gameId}/forfeit`, {});
      if ((game.playerIds?.length ?? 0) === 4) { router.push("/users"); return; }
    } catch { setError("Could not forfeit."); }
  }

  async function handleSkipTurn() {
    try {
      await api.post(`/games/${gameId}/skip`, {});
      fetchGame();
    } catch { setError("Could not skip turn."); }
  }

  // Auto-dismiss errors after 3s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  // ESC cancels ability targeting
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedCard(null); };
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
        display: "block",
        paddingTop: 40, paddingBottom: 40,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Fixed viewport background — always covers 100vw×100vh regardless of content width */}
      <div style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100vh",
        zIndex: -1,
        background: "var(--q-main-bg)",
        transition: "background 0.3s ease",
      }} />
      {/* Content wrapper - fit-content + margin auto centers relative to its own width */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "fit-content", margin: "0 auto" }}>
      <img src="/quoridor.png" alt="Quoridor"
        style={{ height: 240, objectFit: "contain", userSelect: "none" as const }} />

      {/* Error toast */}
      {error && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 99999, background: "var(--q-beam-bg, rgba(20,20,25,0.95))",
          backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          padding: "12px 24px", display: "flex", alignItems: "center", gap: 12,
          animation: "toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
          minWidth: 260, maxWidth: 480,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <span style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: 13, lineHeight: 1.4 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 16, padding: "0 2px", flexShrink: 0 }}>✕</button>
        </div>
      )}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {banner && <p style={{ color: "var(--q-title,#c8a44a)", fontSize: 13 }}>{banner}</p>}
      {game.gameStatus === "ENDED" && (
        <p style={{ color: "var(--q-title,#c8a44a)", fontSize: 15 }}>
          {game.winnerId === userId ? "You win!" : "You lose."}
        </p>
      )}

      {/* Board + Chat via chatSlot */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {mounted && (
          <QuoridorBoard
            mySymbol={mySymbol}
            matrix={game.matrix}
            isMyTurn={isMyTurn}
            validMoves={validMoves}
            onMove={handleMove}
            onWall={handleWall}
            onForfeit={handleForfeit}
            onSkipTurn={handleSkipTurn}
            boardEffect={boardEffect}
            players={players}
            pawnStyles={pawnStyles}
            selectedAbilityCard={selectedCard}
            onAbilityTarget={handleAbilityTarget}
            poisonZones={game.poisonZones}
            frozenPlayerIds={game.frozenPlayerIds}
            isFrozen={game.frozenPlayerIds.map(Number).includes(Number(userId))}
            chatSlot={
              <GameChat
                gameId={gameId}
                userId={userId}
                username={username}
                token={token}
                refreshTrigger={chatRefreshTrigger}
              />
            }
          />
        )}

        {/* Ability inventory below board — outer div stays 624px wide to stay centred under board */}
        {mounted && game.chaosMode && (
          <div style={{ paddingTop: 16, width: 624, display: "flex", justifyContent: "center" }}>
            <div style={{
              background: "var(--q-beam-bg, rgba(20,20,25,0.85))",
              backdropFilter: "blur(10px)",
              border: "1px solid var(--q-beam-border, rgba(255,255,255,0.1))",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              padding: "16px 20px",
              width: "fit-content",
            }}>
              <AbilityInventory
                inventory={shownInventory}
                selectedCard={selectedCard}
                onSelectCard={(card) => card ? handleUseCard(card) : setSelectedCard(null)}
                isMyTurn={isMyTurn}
                landingRef={inventoryLandingRef}
              />
            </div>
          </div>
        )}
      </div>

      {lastSync && (
        <p style={{ color: "var(--q-text-muted,#4a4438)", fontSize: 11, margin: 0 }}>
          last sync {lastSync.toLocaleTimeString()}
        </p>
      )}
      </div>{/* end content wrapper */}

      <CardDrawAnimation
        key={drawKey}
        cardType={drawAnimCard}
        onDone={handleAnimDone}
        inventorySlotRef={inventoryLandingRef}
      />
    </main>
  );
}