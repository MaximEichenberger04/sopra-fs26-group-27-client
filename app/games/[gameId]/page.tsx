"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import QuoridorBoard from "@/components/QuoridorBoard";
import { GameState, CellValue, MATRIX_SIZE } from "@/types/game";

// ── Mock ── swap this out for a real fetch once your backend is ready
async function fetchGame(gameId: string): Promise<GameState> {
  // TODO: replace with  return fetch(`/games/${gameId}`).then(r => r.json())
  return MOCK_GAME;
}

const POLL_INTERVAL_MS = 1000;

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame]       = useState<GameState | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const poll = useCallback(async () => {
    try {
      const data = await fetchGame(gameId);
      setGame(data);
      setLastSync(new Date());
      setError(null);
    } catch (e) {
      setError("Could not reach server.");
    }
  }, [gameId]);

  useEffect(() => {
    poll(); // fetch immediately on mount
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id); // clean up on unmount
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

      {game ? (
        <QuoridorBoard matrix={game.matrix as CellValue[][]} />
      ) : (
        <p style={{ color: "#6a6255", fontSize: 13 }}>Loading…</p>
      )}

      {lastSync && (
        <p style={{ color: "#4a4438", fontSize: 11, margin: 0 }}>
          last sync {lastSync.toLocaleTimeString()}
        </p>
      )}
    </main>
  );
}

// ── Mock game state ───────────────────────────────────────────
// Represents a 9×9 board stored in a 17×17 matrix.
// Player 1 at board (0,4)  →  matrix[0][8]
// Player 2 at board (8,4)  →  matrix[16][8]
// Horizontal wall after board row 3, starting at col 2:
//   covers matrix[7][4], matrix[7][5], matrix[7][6]  (3 consecutive slots)

function makeEmptyMatrix(): CellValue[][] {
  return Array.from({ length: MATRIX_SIZE }, () =>
    new Array<CellValue>(MATRIX_SIZE).fill(0)
  );
}

const MOCK_GAME: GameState = (() => {
  const m = makeEmptyMatrix();

  // Pawns
  m[0][8]   = 1;   // P1 top-centre
  m[16][8]  = 2;   // P2 bottom-centre

  // Example horizontal wall: below board row 3, starting at board col 2
  // → matrix row 7, matrix cols 4-5-6
  m[7][4] = 3;
  m[7][5] = 3;
  m[7][6] = 3;

  // Example vertical wall: right of board col 6, starting at board row 5
  // → matrix col 13, matrix rows 10-11-12
  m[10][13] = 3;
  m[11][13] = 3;
  m[12][13] = 3;

  return { matrix: m };
})();