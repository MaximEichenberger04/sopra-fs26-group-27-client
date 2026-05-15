"use client";

import "./leaderboard.css";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import NavBar from "@/components/NavBar";
import { LeaderboardUser } from "@/types/user";
import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { getCosmeticById } from "@/types/cosmetics";

interface UserStatistics {
  wins: number;
  losses: number;
  winLossRatio: number;
  totalGames: number;
  mostPlayedGameMode: string;
}

interface EnrichedUser extends LeaderboardUser {
  avatarURL?: string | null;
  equippedBorder?: string | null;
  wins?: number | null;
  losses?: number | null;
  statsLoading: boolean;
}

const MEDAL = ["🥇", "🥈", "🥉"];

const Leaderboard: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();

  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { value: token } = useLocalStorage<string>("token", "");

  const enrichUsers = useCallback(async (base: LeaderboardUser[]) => {
    setUsers(base.map((u) => ({ ...u, statsLoading: true })));

    const enriched = await Promise.all(
      base.map(async (u): Promise<EnrichedUser> => {
        try {
          const [profile, stats] = await Promise.all([
            apiService.get<{ avatarURL?: string; equippedBorder?: string }>(`/users/${u.id}`),
            apiService.get<UserStatistics>(`/users/${u.id}/statistics`),
          ]);
          return {
            ...u,
            avatarURL: profile.avatarURL ?? null,
            equippedBorder: profile.equippedBorder ?? null,
            wins: stats.wins ?? 0,
            losses: stats.losses ?? 0,
            statsLoading: false,
          };
        } catch {
          return { ...u, wins: null, losses: null, statsLoading: false };
        }
      })
    );
    setUsers(enriched);
  }, [apiService]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const leaderboardUsers = await apiService.get<LeaderboardUser[]>("/users/leaderboard");
      setError(null);
      await enrichUsers(leaderboardUsers);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  }, [apiService, enrichUsers]);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [token, router, fetchLeaderboard]);

  return (
    <div className="leaderboard-page">
      <NavBar />
      <div className="leaderboard-content">
        <h1 className="leaderboard-title">Leaderboard</h1>
        <p className="leaderboard-subtitle">Global ranking by score</p>

        {error && <p className="leaderboard-error">{error}</p>}

        <div className="g-card" style={{ padding: "20px 8px" }}>
          <div className="leaderboard-row-head">
            <span>Rank</span>
            <span>Player</span>
            <span>Score</span>
            <span className="leaderboard-level-col">Level</span>
            <span>W / L</span>
          </div>

          {users.map((user, index) => {
            const rank = index + 1;
            const borderItem = user.equippedBorder ? getCosmeticById(user.equippedBorder) : null;
            const rowClass = rank === 1 ? "top-1" : rank === 2 ? "top-2" : rank === 3 ? "top-3" : "";
            const rankClass = rank <= 3 ? `rank-${rank}` : "";

            return (
              <div key={user.id ?? index} className={`leaderboard-row ${rowClass}`}>
                <span className={`leaderboard-rank ${rankClass}`}>
                  {rank <= 3 ? MEDAL[rank - 1] : `#${rank}`}
                </span>

                <button
                  className="leaderboard-player-cell"
                  onClick={() => router.push(`/users/${user.id}`)}
                >
                  <div className={`avatar-ring-wrap avatar-ring-sm ${borderItem ? borderItem.cssClass : ""}`}>
                    <Avatar
                      size={34}
                      src={user.avatarURL ?? undefined}
                      icon={!user.avatarURL && <UserOutlined />}
                      style={{ background: "#2a1f12", border: "1px solid rgba(200,168,50,.25)" }}
                    />
                  </div>
                  <div className="leaderboard-player-info">
                    <span className="leaderboard-player-name">
                      {user.displayName || user.username || "Unknown"}
                    </span>
                    {user.displayName && user.username && (
                      <span className="leaderboard-player-username">@{user.username}</span>
                    )}
                  </div>
                </button>

                <span className="leaderboard-score">{user.score ?? 0}</span>
                <span className="leaderboard-level leaderboard-level-col">{user.level ?? 0}</span>

                <div className="leaderboard-wl">
                  {user.statsLoading ? (
                    <span className="wl-loading">…</span>
                  ) : user.wins === null ? (
                    <span className="wl-loading">—</span>
                  ) : (
                    <>
                      <span className="wl-wins">{user.wins}W</span>
                      <span className="wl-sep">/</span>
                      <span className="wl-losses">{user.losses}L</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button className="btn-outline leaderboard-back" onClick={() => router.push("/users")}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Leaderboard;