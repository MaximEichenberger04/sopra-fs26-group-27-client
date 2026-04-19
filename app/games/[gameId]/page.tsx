"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import QuoridorBoard from "@/components/QuoridorBoard";
import useLocalStorage from "@/hooks/useLocalStorage";
import { GameDTO, GameState, CellValue, MATRIX_SIZE } from "@/types/game";
import { useApi } from "@/hooks/useApi";
import { getValidMoves } from "@/utils/validMoves";
import { getApiDomain } from "@/utils/domain";
import { useRouter } from "next/navigation";

function getWsDomain(): string {
  return getApiDomain().replace(/^https/, "wss").replace(/^http/, "ws");
}

function makeEmptyMatrix(): CellValue[][] {
  return Array.from({ length: MATRIX_SIZE }, () =>
    new Array<CellValue>(MATRIX_SIZE).fill(0)
  );
}

function buildMatrix(dto: GameDTO): CellValue[][] {
  const matrix = makeEmptyMatrix();

  for (const wall of dto.walls ?? []) {
    const { row, col, orientation } = wall;
    if (orientation === "HORIZONTAL") {
      if (matrix[row]) {
        matrix[row][col - 1] = 3;
        matrix[row][col]     = 3;
        matrix[row][col + 1] = 3;
      }
    } else {
      if (matrix[row - 1]) matrix[row - 1][col] = 3;
      if (matrix[row])     matrix[row][col]     = 3;
      if (matrix[row + 1]) matrix[row + 1][col] = 3;
    }
  }

  for (let i = 0; i < (dto.pawns ?? []).length; i++) {
    const { row, col } = dto.pawns[i];
    if (matrix[row]) matrix[row][col] = (i + 1) as CellValue;
  }

  return matrix;
}

const EMPTY_GAME_STATE: GameState = {
  matrix: makeEmptyMatrix(),
  currentTurnUserId: -1,
  player1Id: -1,
  player2Id: -1,
  winnerId: null,
  gameStatus: "WAITING_FOR_USER",
  wallsPerPlayer: 0,
  remainingWalls: {},
};

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { value: token }  = useLocalStorage<string>("token", "");
  const { value: userId } = useLocalStorage<number>("userId", -1);

  const [game, setGame]           = useState<GameState>(EMPTY_GAME_STATE);
  const [error, setError]         = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [lastSync, setLastSync]   = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const wsRef                     = useRef<WebSocket | null>(null);
  const router = useRouter();

  // Keep api in a ref so fetchGame doesn't change when api object changes
  const api = useApi(token);
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; }, [api]);

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      });
      setLastSync(new Date());
      if (dto.gameStatus === "ENDED") {
        router.push(`/games/${gameId}/gameend`);
      }
      setError(null);
    } catch {
      setError("Could not reach server.");
    }
  }, [useState, gameId, token, api]);

  const myRemainingWalls = game.remainingWalls?.[String(userId)] ?? 0;

  // WebSocket: open once, re-fetch on any event for this game
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

          if (msg.type === "PLAYER_DISCONNECTED") {
            if (Number(msg.userId) !== userId) {
              setBanner(
                `A player disconnected. Waiting ${msg.gracePeriodSeconds ?? 30} seconds for reconnection.`
              );
            }
          } else if (msg.type === "PLAYER_RECONNECTED") {
            setBanner("The disconnected player reconnected.");
            if (bannerTimeout) clearTimeout(bannerTimeout);
            bannerTimeout = setTimeout(() => setBanner(null), 3000);
          } else if (msg.type === "PLAYER_FORFEITED") {
            if (Number(msg.userId) === userId) {
              setBanner("You were removed from the game after not reconnecting in time.");
            } else {
              setBanner("A disconnected player did not return and was removed from the game.");
            }
          } else if (msg.type === "MOVE" || msg.type === "WALL" || msg.type === "FORFEIT" || msg.type === "GAME_UPDATED") {
            setBanner(null);
          }

          fetchGame();
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => {
        setError("WebSocket error — retrying...");
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!destroyed) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimeout);
      if (bannerTimeout) clearTimeout(bannerTimeout);
      ws?.close();
    };
  }, [gameId, fetchGame, userId]); // ← fetchGame is now stable

  // derived
  const isMyTurn  = userId !== -1 && game.currentTurnUserId === userId;
  const mySymbol: CellValue = game.player1Id === userId ? 1 : 2;
  const validMoves = isMyTurn ? getValidMoves(game.matrix, mySymbol) : [];

  async function handleMove(matrixRow: number, matrixCol: number) {
    if (!isMyTurn) return;
    try {
      await apiRef.current.post(`/games/${gameId}/move`, { targetField: [matrixRow, matrixCol] });
      fetchGame();
    } catch {
      setError("Invalid move.");
    }
  }

  async function handleWall(matrixRow: number, matrixCol: number, orientation: "HORIZONTAL" | "VERTICAL") {
    if (!isMyTurn) return;
    try {
      const centerRow = orientation === "HORIZONTAL" ? matrixRow     : matrixRow + 1;
      const centerCol = orientation === "HORIZONTAL" ? matrixCol + 1 : matrixCol;
      await apiRef.current.post(`/games/${gameId}/wall`, { targetField: [centerRow, centerCol], orientation });
      fetchGame();
    } catch {
      setError("Invalid wall placement.");
    }
  }

  async function handleForfeit() {
    try {
      await api.post(`/games/${gameId}/forfeit`, {});
    } catch {
      setError("Could not forfeit.");
    }
  }

  return (
    <main style={{
      minHeight: "100vh", background: "#12100d",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 20, fontFamily: "system-ui, sans-serif",
    }}>
      <h1 style={{ color: "#c8a44a", fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: "0.08em" }}>
        QUORIDOR
      </h1>

      {error && <p style={{ color: "#d96b6b", fontSize: 13 }}>{error}</p>}
      {banner && <p style={{ color: "#c8a44a", fontSize: 13 }}>{banner}</p>}

      {game.gameStatus === "ENDED" && (
        <p style={{ color: "#c8a44a", fontSize: 15 }}>
          {game.winnerId === userId ? "🏆 You win!" : "💀 You lose."}
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
        />
      )}

      {lastSync && (
        <p style={{ color: "#4a4438", fontSize: 11, margin: 0 }}>
          last sync {lastSync.toLocaleTimeString()}
        </p>
      )}
    </main>
  );
}
