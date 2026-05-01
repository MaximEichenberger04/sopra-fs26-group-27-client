"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import QuoridorBoard, { PlayerInfo } from "@/components/QuoridorBoard";
import GameChat from "@/components/GameChat";
import useLocalStorage from "@/hooks/useLocalStorage";
import { GameDTO, GameState, CellValue, MATRIX_SIZE, WALL_VALUE } from "@/types/game";
import { User } from "@/types/user";
import { useApi } from "@/hooks/useApi";
import { getValidMoves } from "@/utils/validMoves";
import { getApiDomain } from "@/utils/domain";

import "@/styles/gameBoard.css";

// Map cosmetic IDs to CSS gradient strings for pawn skins
const PAWN_SKIN_GRADIENTS: Record<string, string> = {
  "pawn-lava": "linear-gradient(135deg, #e04020, #f0a030, #e04020)",
  "pawn-ocean": "linear-gradient(135deg, #2060b0, #40a0e0, #2060b0)",
  "pawn-galaxy": "linear-gradient(135deg, #2a1a4a, #6a3a9a, #2a1a4a)",
  "pawn-forest": "linear-gradient(135deg, #1a4a20, #3a8a30, #1a4a20)",
  "pawn-diamond": "linear-gradient(135deg, #a0c0e0, #e0f0ff, #a0c0e0)",
  "pawn-gold": "linear-gradient(135deg, #8a7420, #e8d06a, #8a7420)",
  "pawn-void": "linear-gradient(135deg, #0a0a1a, #2a2a4a, #0a0a1a)",
  "pawn-rose": "linear-gradient(135deg, #9a3060, #e070a0, #9a3060)",
};

function getWsDomain(): string {
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
        matrix[row][col] = WALL_VALUE;
        matrix[row][col + 1] = WALL_VALUE;
      }
    } else {
      if (matrix[row - 1]) matrix[row - 1][col] = WALL_VALUE;
      if (matrix[row]) matrix[row][col] = WALL_VALUE;
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
};

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { value: token } = useLocalStorage<string>("token", "");
  const { value: userId } = useLocalStorage<number>("userId", -1);
  const router = useRouter();

  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [pawnStyles, setPawnStyles] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [forfeitedPlayerIds, setForfeitedPlayerIds] = useState<number[]>([]);

  const [chatRefreshTrigger, setChatRefreshTrigger] = useState(0);
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const [boardHeight, setBoardHeight] = useState(0);

  useEffect(() => {
    if (!boardWrapRef.current) return;
    const observer = new ResizeObserver(entries => {
      setBoardHeight(entries[0].contentRect.height);
    });
    observer.observe(boardWrapRef.current);
    return () => observer.disconnect();
  }, [mounted]);

  const wsRef = useRef<WebSocket | null>(null);
  const playerCountRef = useRef(0);
  const forfeitedRef = useRef<number[]>([]);

  const api = useApi(token);
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; }, [api]);

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { playerCountRef.current = game.playerIds?.length ?? 0; }, [game.playerIds]);
  useEffect(() => { forfeitedRef.current = forfeitedPlayerIds; }, [forfeitedPlayerIds]);

  const fetchedIdsRef = useRef<string>("");

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
        matrix: strippedMatrix,
        currentTurnUserId: dto.currentTurnUserId,
        playerIds: dto.playerIds ?? [],
        winnerId: dto.winnerId,
        gameStatus: dto.gameStatus,
        wallsPerPlayer: dto.wallsPerPlayer,
        remainingWalls: dto.remainingWalls,
        mapTheme: dto.mapTheme || "mystic-grove",
      });
      setLastSync(new Date());

      // Fetch player names (once per unique player set)
      const idsKey = (dto.playerIds ?? []).join(",");
      if (idsKey && idsKey !== fetchedIdsRef.current) {
        fetchedIdsRef.current = idsKey;
        const infos: PlayerInfo[] = [];
        const skinStyles: Record<number, string> = {};
        for (const pid of dto.playerIds ?? []) {
          const symbol = (dto.playerIds.findIndex((id) => id === pid) + 1) as 1 | 2 | 3 | 4;
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

      if (dto.gameStatus === "ENDED") {
        router.push(`/games/${gameId}/gameend`);
      }
      setError(null);
    } catch {
      setError("Could not reach server.");
    }
  }, [gameId, router]);

  // WebSocket
  useEffect(() => {
    fetchGame();

    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let bannerTimeout: ReturnType<typeof setTimeout> | undefined;
    let destroyed = false;

    function connect() {
      ws = new WebSocket(`${getWsDomain()}/game-refresh-websocket`);
      wsRef.current = ws;

      ws.onopen = () => {
        setError(null);
        if (!tokenRef.current) return;
        ws.send(JSON.stringify({
          type: "REGISTER",
          gameId: Number(gameId),
          token: tokenRef.current,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type: string;
            gameId: string | number;
            userId?: string | number;
            gracePeriodSeconds?: number;
          };

          if (String(msg.gameId) !== String(gameId)) return;

          if (msg.type === "CHAT") {
            setChatRefreshTrigger(n => n + 1);
            return;
          }

          if (msg.type === "PLAYER_DISCONNECTED") {
            if (Number(msg.userId) !== userId) {
              setBanner(`A player disconnected. Waiting ${msg.gracePeriodSeconds ?? 30}s for reconnection.`);
            }
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
              if (playerCountRef.current === 4) {
                router.push("/users");
                return;
              }
              setBanner("You forfeited the game.");
            } else {
              setBanner("A player forfeited and left the game.");
            }
          } else if (msg.type === "MOVE" || msg.type === "WALL" || msg.type === "GAME_UPDATED") {
            setBanner(null);
          }

          fetchGame();
        } catch { /* ignore */ }
      };

      ws.onerror = () => { setError("WebSocket error — retrying..."); };

      ws.onclose = () => {
        wsRef.current = null;
        if (!destroyed) reconnectTimeout = setTimeout(connect, 3000);
      };
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

  const isMyTurn = userId !== -1 && game.currentTurnUserId === userId;
  const myPlayerIndex = game.playerIds.findIndex((id) => id === userId);
  const mySymbol = (myPlayerIndex >= 0 ? myPlayerIndex + 1 : 1) as 1 | 2 | 3 | 4;
  const validMoves = isMyTurn ? getValidMoves(game.matrix, mySymbol) : [];

  async function handleMove(matrixRow: number, matrixCol: number) {
    if (!isMyTurn) return;
    try {
      await apiRef.current.post(`/games/${gameId}/move`, { targetField: [matrixRow, matrixCol] });
      fetchGame();
    } catch { setError("Invalid move."); }
  }

  async function handleWall(matrixRow: number, matrixCol: number, orientation: "HORIZONTAL" | "VERTICAL") {
    if (!isMyTurn) return;
    try {
      const centerRow = orientation === "HORIZONTAL" ? matrixRow : matrixRow + 1;
      const centerCol = orientation === "HORIZONTAL" ? matrixCol + 1 : matrixCol;
      await apiRef.current.post(`/games/${gameId}/wall`, { targetField: [centerRow, centerCol], orientation });
      fetchGame();
    } catch { setError("Invalid wall placement."); }
  }

  async function handleForfeit() {
    try {
      await api.post(`/games/${gameId}/forfeit`, {});
      if ((game.playerIds?.length ?? 0) === 4) {
        router.push("/users");
        return;
      }
    } catch { setError("Could not forfeit."); }
  }

  const activeTheme = game.mapTheme;

  return (
    <main
      className={`theme-${activeTheme}`}
      style={{
        minHeight: "100vh",
        background: "var(--q-main-bg)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 20, fontFamily: "system-ui, sans-serif",
      }}>

      <h1 style={{ color: "var(--q-title, #c8a44a)", fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: "0.08em" }}>
        QUORIDOR
      </h1>

      {error && <p style={{ color: "#d96b6b", fontSize: 13 }}>{error}</p>}
      {banner && <p style={{ color: "var(--q-title, #c8a44a)", fontSize: 13 }}>{banner}</p>}

      {game.gameStatus === "ENDED" && (
        <p style={{ color: "var(--q-title, #c8a44a)", fontSize: 15 }}>
          {game.winnerId === userId ? "You win!" : "You lose."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start" }}>
        <div ref={boardWrapRef}>
          {mounted && (
            <QuoridorBoard
              mySymbol={mySymbol}
              matrix={game.matrix}
              isMyTurn={isMyTurn}
              validMoves={validMoves}
              onMove={handleMove}
              onWall={handleWall}
              onForfeit={handleForfeit}
              players={players}
              pawnStyles={pawnStyles}
            />
          )}
        </div>

        <div style={{ marginLeft: 30, flexShrink: 0, width: 380, display: "flex", flexDirection: "column", height: boardHeight || undefined, overflow: "hidden", borderRadius: 12 }}>
          <GameChat
            gameId={gameId}
            userId={userId}
            username={username}
            token={token}
            refreshTrigger={chatRefreshTrigger}
          />
        </div>
      </div>

      {lastSync && (
        <p style={{ color: "var(--q-text-muted, #4a4438)", fontSize: 11, margin: 0 }}>
          last sync {lastSync.toLocaleTimeString()}
        </p>
      )}
    </main>
  );
}