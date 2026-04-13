"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import QuoridorBoard from "@/components/QuoridorBoard";
import useLocalStorage from "@/hooks/useLocalStorage";
import { GameDTO, GameState, CellValue, MATRIX_SIZE } from "@/types/game";
import { useApi } from "@/hooks/useApi";
import { getValidMoves } from "@/utils/validMoves";
import { getApiDomain } from "@/utils/domain";

function getWsDomain(): string {
  return getApiDomain().replace(/^http/, "ws");
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
};

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { value: token }  = useLocalStorage<string>("token", "");
  const { value: userId } = useLocalStorage<number>("userId", -1);

  const [game, setGame]           = useState<GameState>(EMPTY_GAME_STATE);
  const [error, setError]         = useState<string | null>(null);
  const [lastSync, setLastSync]   = useState<Date | null>(null);
  const wsRef                     = useRef<WebSocket | null>(null);

  // token is passed into ApiService so Authorization header is included
  const api = useApi(token);

  const fetchGame = useCallback(async () => {
    if (!token) return;
    try {
      const dto = await api.get<GameDTO>(`/games/${gameId}`);
      setGame({
        matrix:            buildMatrix(dto),
        currentTurnUserId: dto.currentTurnUserId,
        player1Id:         dto.playerIds?.[0] ?? -1,
        player2Id:         dto.playerIds?.[1] ?? -1,
        winnerId:          dto.winnerId,
        gameStatus:        dto.gameStatus,
      });
      setLastSync(new Date());
      setError(null);
    } catch {
      setError("Could not reach server.");
    }
  }, [gameId, token, api]);

  // WebSocket: open once, re-fetch on any event for this game
  useEffect(() => {
    fetchGame();

    const ws = new WebSocket(`${getWsDomain()}/game-refresh-websocket`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; gameId: string };
        if (msg.gameId === gameId) fetchGame();
      } catch { /* ignore malformed frames */ }
    };

    ws.onerror = () => setError("WebSocket error — falling back to last known state.");

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [gameId, fetchGame]);

  // derived
  const isMyTurn  = userId !== -1 && game.currentTurnUserId === userId;
  const mySymbol: CellValue = game.player1Id === userId ? 1 : 2;
  const validMoves = isMyTurn ? getValidMoves(game.matrix, mySymbol) : [];

  async function handleMove(matrixRow: number, matrixCol: number) {
    if (!isMyTurn) return;
    try {
      await api.post(`/games/${gameId}/move`, { targetField: [matrixRow, matrixCol] });
      fetchGame();
    } catch {
      setError("Invalid move.");
    }
  }

  async function handleWall(matrixRow: number, matrixCol: number, orientation: "HORIZONTAL" | "VERTICAL") {
    if (!isMyTurn) return;
    try {
      await api.post(`/games/${gameId}/wall`, { targetField: [matrixRow, matrixCol], orientation });
      fetchGame();
    } catch {
      setError("Invalid wall placement.");
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

      {game.gameStatus === "ENDED" && (
        <p style={{ color: "#c8a44a", fontSize: 15 }}>
          {game.winnerId === userId ? "🏆 You win!" : "💀 You lose."}
        </p>
      )}

      <QuoridorBoard
        matrix={game.matrix}
        isMyTurn={isMyTurn}
        validMoves={validMoves}
        onMove={handleMove}
        onWall={handleWall}
      />

      {lastSync && (
        <p style={{ color: "#4a4438", fontSize: 11, margin: 0 }}>
          last sync {lastSync.toLocaleTimeString()}
        </p>
      )}
    </main>
  );
}