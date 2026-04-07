"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import QuoridorBoard from "@/components/QuoridorBoard";
import useLocalStorage from "@/hooks/useLocalStorage";
import { GameState, CellValue, MATRIX_SIZE } from "@/types/game";

const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

function makeEmptyMatrix(): CellValue[][] {
  return Array.from({ length: MATRIX_SIZE }, () =>
    new Array<CellValue>(MATRIX_SIZE).fill(0)
  );
}

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { value: token } = useLocalStorage<string>("token", "");
  const [game, setGame] = useState<GameState>({ matrix: makeEmptyMatrix() });
  const [error, setError]       = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/games/${gameId}`, {
        headers: { "Authorization": token },
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data: GameState = await res.json();
      setGame(data);
      setLastSync(new Date());
      setError(null);
    } catch (e) {
      setError("Could not reach server.");
    }
  }, [gameId, token]); // token is now a dependency

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [poll]);

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

      <QuoridorBoard matrix={game.matrix as CellValue[][]} />

      {lastSync && (
        <p style={{ color: "#4a4438", fontSize: 11, margin: 0 }}>
          last sync {lastSync.toLocaleTimeString()}
        </p>
      )}
    </main>
  );
}

