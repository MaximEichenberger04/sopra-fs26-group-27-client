"use client";

import "./users.css";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import NavBar from "@/components/NavBar";
import { getCosmeticById } from "@/types/cosmetics";

// ─── Match record ─────────────────────────────────────────────────────────────
interface MatchRecord {
  id: number;
  gameId: number;
  opponentUsernames: string;
  gameMode: string;
  won: boolean;
  playedAt: string;
}

function modeIcon(gameMode?: string | null): string {
  if (gameMode === "CLASSIC") return "♟️";
  if (gameMode === "CHAOS") return "☠️";
}

// ─── Today filter ─────────────────────────────────────────────────────────────
function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getPlayerCount(opponentUsernames?: string | null): number {
  if (!opponentUsernames?.trim()) return 2;
  return opponentUsernames.split(",").filter((n) => n.trim()).length + 1;
}

function allPlayerNames(opponentUsernames?: string | null): string {
  if (!opponentUsernames?.trim()) return "Solo";
  return opponentUsernames
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .join(", ");
}

// ─── Component ────────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [todayMatches, setTodayMatches] = useState<MatchRecord[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const { value: token } = useLocalStorage<string>("token", "");
  const { value: userId } = useLocalStorage<string>("userId", "");

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        if (userId) {
          const user = await apiService.get<User>(`/users/${userId}`);
          setCurrentUser(user);
        }
      } catch (error) {
        if (error instanceof Error) console.error("Failed to fetch user:", error.message);
      }
    };

    const fetchTodayMatches = async () => {
      if (!userId) return;
      setMatchesLoading(true);
      try {
        const history = await apiService.get<MatchRecord[]>(`/users/${userId}/match-history`);
        const filtered = history
          .filter((m) => isToday(m.playedAt))
          .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
          .slice(0, 10);
        setTodayMatches(filtered);
      } catch {
        setTodayMatches([]);
      } finally {
        setMatchesLoading(false);
      }
    };

    fetchUser();
    fetchTodayMatches();
  }, [apiService, token, userId, router]);

  const borderItem = currentUser?.equippedBorder ? getCosmeticById(currentUser.equippedBorder) : null;

  const todayLabel = new Date().toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (!currentUser) return null;

  return (
    <div className="dash-page">
      <NavBar />
      <div className="dash-content">
        {/* Left Column */}
        <div className="dash-col-left">
          <div className="g-card dash-play-card">
            <p className="dash-play-label">Ready to play?</p>
            <button className="btn-gold dash-find-btn" onClick={() => router.push("/lobbies")}>
              ► Find Game
            </button>
            <div className="dash-divider" />
            <button className="btn-outline" onClick={() => router.push("/lobby")}>
              + Create Lobby
            </button>
          </div>

          {/* ── Recent Matches card ── */}
          <div className="g-card dash-matches-card">
            <div className="dash-matches-header">
              <h3 className="g-section-title" style={{ margin: 0 }}>Recent Matches</h3>
              <span className="dash-matches-date">{todayLabel}</span>
            </div>

            {matchesLoading ? (
              <p className="dash-muted-text">Loading...</p>
            ) : todayMatches.length === 0 ? (
              <p className="dash-muted-text">No matches played today yet.</p>
            ) : (
              <div className="dash-match-list">
                {todayMatches.map((match) => {
                  const isWin = match.won;
                  const playerCount = getPlayerCount(match.opponentUsernames);
                  const players = allPlayerNames(match.opponentUsernames);

                  return (
                    <div
                      key={match.id}
                      className={`dash-match-row ${isWin ? "dash-match-win" : "dash-match-loss"}`}
                    >
                      <div className={`dash-match-badge ${isWin ? "dash-badge-win" : "dash-badge-loss"}`}>
                        {isWin ? "W" : "L"}
                      </div>
                      <div className="dash-match-body">
                        <div className="dash-match-players">
                          <span className="dash-match-player-count">{playerCount} Player-Mode</span>
                          <span className="dash-match-player-names">{players}</span>
                        </div>
                        <div className="dash-match-tags">
                          <span className="dash-match-mode-tag">
                            {modeIcon(match.gameMode)} {(match.gameMode)}
                          </span>
                        </div>
                      </div>
                      <span className="dash-match-time">{formatTime(match.playedAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="dash-col-right">
          <div className="g-card dash-profile-card">
            <div className="dash-profile-header">
              <div className={`avatar-ring-wrap ${borderItem ? borderItem.cssClass : ""}`}>
                <Avatar
                  size={48}
                  src={currentUser.avatarURL ?? undefined}
                  icon={!currentUser.avatarURL && <UserOutlined />}
                  className="nav-avatar"
                />
              </div>
              <div className="dash-profile-info">
                <span className="dash-profile-name">{currentUser.displayName}</span>
                <span className="dash-profile-level">Level {currentUser.level ?? 0}</span>
              </div>
            </div>
            <div className="dash-xp-section">
              {(() => {
                const level = currentUser.level ?? 1;
                const xpLevelStart = 130 * level * (level - 1) / 2;
                const xpLevelEnd = 130 * (level + 1) * level / 2;
                const progress = currentUser.xpCurrentLevelProgress ?? 0;
                const required = currentUser.xpRequiredForNextLevel ?? 130;
                const pct = required > 0 ? Math.min((progress / required) * 100, 100) : 0;
                return (
                  <>
                    <div className="dash-xp-bar-bg">
                      <div className="dash-xp-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="dash-xp-labels">
                      <span className="dash-xp-text">{xpLevelStart} XP</span>
                      <span className="dash-xp-text">{xpLevelEnd} XP</span>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="dash-stats-grid">
              <div className="dash-stat-box">
                <span className="dash-stat-value">{currentUser.score ?? 0}</span>
                <span className="dash-stat-label">Score</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-value">{currentUser.level ?? 0}</span>
                <span className="dash-stat-label">Level</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-value">{currentUser.xp ?? 0}</span>
                <span className="dash-stat-label">XP</span>
              </div>
            </div>
          </div>

          <button className="g-card dash-leaderboard-btn" onClick={() => router.push("/leaderboard")}>
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;