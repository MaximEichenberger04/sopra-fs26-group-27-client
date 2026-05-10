"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { GameDTO } from "@/types/game";
import { User } from "@/types/user";

interface MatchResult {
  userId: number;
  won: boolean;
  xpEarned: number;
}

interface LeaderboardEntry {
  userId: number;
  username: string;
  won: boolean;
  forfeited: boolean;
  xpEarned: number;
}

export default function WinningPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { value: token } = useLocalStorage<string>("token", "");
  const { value: userId } = useLocalStorage<number>("userId", -1);
  const api = useApi(token);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [iWon, setIWon] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        // 1) Fetch game state — this is critical for determining the winner
        const dto = await api.get<GameDTO>(`/games/${gameId}`);
        const winnerId = dto.winnerId;
        const playerIds = dto.playerIds ?? [];
        const activePlayerIds = dto.activePlayerIds ?? [];
        setIWon(winnerId === userId);

        // 2) Fetch match results separately — non-critical, XP display only
        let xpMap = new Map<number, number>();
        try {
          const results = await api.get<MatchResult[]>(`/games/${gameId}/results`);
          for (const r of results) {
            xpMap.set(r.userId, r.xpEarned);
          }
        } catch {
          // Results endpoint may fail if cache was already evicted — continue without XP
        }

        // 3) Build leaderboard entries
        const playerEntries: LeaderboardEntry[] = await Promise.all(
          playerIds.map(async (pid: number) => {
            try {
              const user = await api.get<User>(`/users/${pid}`);
              const won = pid === winnerId;
              const forfeited = activePlayerIds.length > 0
                ? (!activePlayerIds.includes(pid) && !won)
                : false;

              return {
                userId: pid,
                username: user.username ?? `Player ${pid}`,
                won,
                forfeited,
                xpEarned: xpMap.get(pid) ?? 0,
              };
            } catch {
              return {
                userId: pid,
                username: `Player ${pid}`,
                won: pid === winnerId,
                forfeited: false,
                xpEarned: xpMap.get(pid) ?? 0,
              };
            }
          })
        );

        // Sort: winner first, then by XP descending, forfeited last
        playerEntries.sort((a, b) => {
          if (a.won !== b.won) return b.won ? 1 : -1;
          if (a.forfeited !== b.forfeited) return a.forfeited ? 1 : -1;
          return b.xpEarned - a.xpEarned;
        });
        setEntries(playerEntries);
      } catch {
        // Even the game fetch failed — winnerId unknown, show fallback
        setIWon(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [gameId, token, userId, api]);

  if (loading) {
    return (
      <main style={styles.root}>
        <div style={{ color: "#4a4438", fontSize: 13, letterSpacing: "0.1em" }}>LOADING…</div>
      </main>
    );
  }

  return (
    <main style={styles.root}>
      {/* Background grid decoration */}
      <div style={styles.gridOverlay} aria-hidden />

      {/* Result banner */}
      <div style={styles.banner}>
        <div style={{
          ...styles.resultLabel,
          color: iWon === true ? "#c8a44a" : iWon === false ? "#6a3a3a" : "#4a4438",
          textShadow: iWon === true
            ? "0 0 40px rgba(200,164,74,0.5), 0 0 80px rgba(200,164,74,0.2)"
            : iWon === false
              ? "0 0 40px rgba(200,80,80,0.3)"
              : "none",
        }}>
          {iWon === true ? "VICTORY" : iWon === false ? "DEFEAT" : "GAME OVER"}
        </div>
        <div style={styles.resultSub}>
          {iWon === true
            ? "The path is yours."
            : iWon === false
              ? "The walls held you back."
              : "Could not load game results."}
        </div>
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Leaderboard */}
      <div style={styles.leaderboard}>
        <div style={styles.leaderboardTitle}>RESULT</div>
        {entries.map((entry, i) => (
          <div
            key={entry.userId}
            style={{
              ...styles.row,
              borderColor: entry.won
                ? "rgba(200,164,74,0.25)"
                : entry.forfeited
                  ? "rgba(80,70,60,0.2)"
                  : "rgba(107,58,58,0.2)",
              background: entry.won
                ? "rgba(200,164,74,0.05)"
                : entry.forfeited
                  ? "rgba(80,70,60,0.03)"
                  : "rgba(107,58,58,0.04)",
            }}
          >
            {/* Rank */}
            <div style={{
              ...styles.rank,
              color: entry.won ? "#c8a44a" : entry.forfeited ? "#3a3228" : "#4a3030",
            }}>
              {i + 1}
            </div>

            {/* Name */}
            <div style={styles.name}>
              <span style={entry.forfeited ? { textDecoration: "line-through", opacity: 0.5 } : {}}>
                {entry.username}
              </span>
              {entry.userId === userId && (
                <span style={styles.youBadge}>YOU</span>
              )}
            </div>

            {/* XP Earned */}
            <div style={{
              ...styles.xpBadge,
              color: entry.xpEarned > 0 ? "#c8a44a" : "#4a3a28",
              opacity: entry.xpEarned > 0 ? 1 : 0.5,
            }}>
              +{entry.xpEarned} XP
            </div>

            {/* Result badge */}
            <div style={{
              ...styles.badge,
              color: entry.won ? "#c8a44a" : entry.forfeited ? "#4a3a28" : "#6a4040",
              borderColor: entry.won
                ? "rgba(200,164,74,0.35)"
                : entry.forfeited
                  ? "rgba(80,70,60,0.3)"
                  : "rgba(107,64,64,0.3)",
              background: entry.won
                ? "rgba(200,164,74,0.08)"
                : entry.forfeited
                  ? "rgba(80,70,60,0.06)"
                  : "rgba(107,64,64,0.06)",
            }}>
              {entry.won ? "WIN" : entry.forfeited ? "QUIT" : "LOSS"}
            </div>
          </div>
        ))}
      </div>

      {/* Return button */}
      <button
        onClick={() => router.push("/users")}
        style={styles.returnBtn}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(200,164,74,0.12)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#c8a44a";
          (e.currentTarget as HTMLButtonElement).style.color = "#c8a44a";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#3a3228";
          (e.currentTarget as HTMLButtonElement).style.color = "#6a5a3a";
        }}
      >
        RETURN TO LOBBY
      </button>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#0e0d0b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    fontFamily: "'Cinzel', serif",
    position: "relative",
    overflow: "hidden",
    padding: "40px 20px",
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(200,164,74,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(200,164,74,0.03) 1px, transparent 1px)
    `,
    backgroundSize: "48px 48px",
    pointerEvents: "none",
  },
  banner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    zIndex: 1,
  },
  resultLabel: {
    fontSize: "clamp(48px, 10vw, 80px)",
    fontWeight: 700,
    letterSpacing: "0.18em",
    lineHeight: 1,
  },
  resultSub: {
    color: "#4a4438",
    fontSize: 13,
    letterSpacing: "0.2em",
    fontStyle: "italic",
  },
  divider: {
    width: 280,
    height: 1,
    background: "linear-gradient(90deg, transparent, #3a3228, transparent)",
    zIndex: 1,
  },
  leaderboard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
    maxWidth: 420,
    zIndex: 1,
  },
  leaderboardTitle: {
    color: "#3a3228",
    fontSize: 10,
    letterSpacing: "0.2em",
    marginBottom: 4,
    textAlign: "center",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "12px 16px",
    border: "1px solid",
    borderRadius: 6,
    transition: "background 0.15s",
  },
  rank: {
    fontSize: 18,
    fontWeight: 700,
    width: 20,
    textAlign: "center",
    flexShrink: 0,
  },
  name: {
    flex: 1,
    color: "#9a8a6a",
    fontSize: 13,
    letterSpacing: "0.08em",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  youBadge: {
    fontSize: 9,
    color: "#4a4438",
    border: "1px solid #3a3228",
    borderRadius: 3,
    padding: "1px 5px",
    letterSpacing: "0.1em",
  },
  xpBadge: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.06em",
    fontFamily: "'Crimson Text', serif",
    flexShrink: 0,
    minWidth: 60,
    textAlign: "right",
  },
  badge: {
    fontSize: 10,
    letterSpacing: "0.12em",
    border: "1px solid",
    borderRadius: 4,
    padding: "3px 8px",
    flexShrink: 0,
    minWidth: 40,
    textAlign: "center",
  },
  returnBtn: {
    zIndex: 1,
    background: "transparent",
    border: "1px solid #3a3228",
    borderRadius: 6,
    color: "#6a5a3a",
    fontSize: 11,
    letterSpacing: "0.18em",
    padding: "10px 28px",
    cursor: "pointer",
    fontFamily: "'Cinzel', serif",
    transition: "all 0.15s",
  },
};