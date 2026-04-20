"use client";
 
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { GameDTO } from "@/types/game";
import { User } from "@/types/user";
 
interface LeaderboardEntry {
  userId: number;
  username: string;
  won: boolean;
}
 
export default function WinningPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { value: token }  = useLocalStorage<string>("token", "");
  const { value: userId } = useLocalStorage<number>("userId", -1);
  const api = useApi(token);
 
  const [entries, setEntries]   = useState<LeaderboardEntry[]>([]);
  const [iWon, setIWon]         = useState<boolean | null>(null);
  const [loading, setLoading]   = useState(true);
 
  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const dto = await api.get<GameDTO>(`/games/${gameId}`);
        const winnerId = dto.winnerId;
        setIWon(winnerId === userId);
 
        // fetch usernames for all players
        const playerEntries: LeaderboardEntry[] = await Promise.all(
          (dto.playerIds ?? []).map(async (pid) => {
            try {
              const user = await api.get<User>(`/users/${pid}`);
              return {
                userId: pid,
                username: user.username ?? `Player ${pid}`,
                won: pid === winnerId,
              };
            } catch {
              return { userId: pid, username: `Player ${pid}`, won: pid === winnerId };
            }
          })
        );
 
        // winner first
        playerEntries.sort((a, b) => (b.won ? 1 : 0) - (a.won ? 1 : 0));
        setEntries(playerEntries);
      } catch {
        // fallback — just show result
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
          color: iWon ? "#c8a44a" : "#6a3a3a",
          textShadow: iWon
            ? "0 0 40px rgba(200,164,74,0.5), 0 0 80px rgba(200,164,74,0.2)"
            : "0 0 40px rgba(200,80,80,0.3)",
        }}>
          {iWon ? "VICTORY" : "DEFEAT"}
        </div>
        <div style={styles.resultSub}>
          {iWon ? "The path is yours." : "The walls held you back."}
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
              borderColor: entry.won ? "rgba(200,164,74,0.25)" : "rgba(107,58,58,0.2)",
              background:  entry.won ? "rgba(200,164,74,0.05)" : "rgba(107,58,58,0.04)",
            }}
          >
            {/* Rank */}
            <div style={{
              ...styles.rank,
              color: entry.won ? "#c8a44a" : "#4a3030",
            }}>
              {i + 1}
            </div>
 
            {/* Name */}
            <div style={styles.name}>
              {entry.username}
              {entry.userId === userId && (
                <span style={styles.youBadge}>YOU</span>
              )}
            </div>
 
            {/* Result badge */}
            <div style={{
              ...styles.badge,
              color:       entry.won ? "#c8a44a" : "#6a4040",
              borderColor: entry.won ? "rgba(200,164,74,0.35)" : "rgba(107,64,64,0.3)",
              background:  entry.won ? "rgba(200,164,74,0.08)" : "rgba(107,64,64,0.06)",
            }}>
              {entry.won ? "WIN" : "LOSS"}
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
    maxWidth: 360,
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
  badge: {
    fontSize: 10,
    letterSpacing: "0.12em",
    border: "1px solid",
    borderRadius: 4,
    padding: "3px 8px",
    flexShrink: 0,
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