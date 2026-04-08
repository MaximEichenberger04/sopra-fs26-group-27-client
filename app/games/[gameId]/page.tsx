"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import QuoridorBoard from "@/components/QuoridorBoard";
import useLocalStorage from "@/hooks/useLocalStorage";
import { GameState, CellValue, MATRIX_SIZE } from "@/types/game";
import { useApi } from "@/hooks/useApi";
import { getValidMoves } from "@/utils/validMoves";

const POLL_INTERVAL_MS = 2000;

function makeEmptyMatrix(): CellValue[][] {
  return Array.from({ length: MATRIX_SIZE }, () =>
    new Array<CellValue>(MATRIX_SIZE).fill(0)
  );
}

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { value: token } = useLocalStorage<string>("token", "");
  const { value: userId } = useLocalStorage<number>("userId", -1);
  const [game, setGame] = useState<GameState>({
    matrix: makeEmptyMatrix(),
    currentTurnUserId: -1,
    player1Id: -1,
    player2Id: -1,
  });
  const [currentTurnUserId, setCurrentTurnUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const api = useApi();

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/games/${gameId}`, {
        headers: { "Authorization": token },
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data: GameState = await res.json();
      setGame(data);
      setCurrentTurnUserId(data.currentTurnUserId); // store it in state
      setLastSync(new Date());
      setError(null);
    } catch (e) {
      setError("Could not reach server.");
    }
  }, [gameId, token]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [poll]);

  const isMyTurn = userId !== -1 && currentTurnUserId === userId;

  // figure out which cell value represents the current user
  // assumes player1Id and player2Id are also returned by the backend
  const mySymbol: CellValue = game.player1Id === userId ? 1 : 2;

  const validMoves = isMyTurn
    ? getValidMoves(game.matrix, mySymbol)
    : [];

  async function handleMove(matrixRow: number, matrixCol: number) {
    if (!isMyTurn) return;
    try {
      await api.post(`/games/${gameId}/move`, {
        targetField: [matrixRow, matrixCol],
      });
      poll();
    } catch (e) {
      setError("Invalid move.");
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#12100d",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      fontFamily: "system-ui, sans-serif",
    }}>
      <h1 style={{ color: "#c8a44a", fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: "0.08em" }}>
        QUORIDOR
      </h1>

      {error && (
        <p style={{ color: "#d96b6b", fontSize: 13 }}>{error}</p>
      )}

      <QuoridorBoard
        matrix={game.matrix as CellValue[][]}
        isMyTurn={isMyTurn}
        validMoves={validMoves}
        onMove={handleMove}
      />

      {lastSync && (
        <p style={{ color: "#4a4438", fontSize: 11, margin: 0 }}>
          last sync {lastSync.toLocaleTimeString()}
        </p>
      )}
    </main>
  );
}