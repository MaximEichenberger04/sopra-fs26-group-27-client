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

const Dashboard: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const { value: token, clear: clearToken } = useLocalStorage<string>("token", "");
  const { value: userId, clear: clearUserId } = useLocalStorage<string>("userId", "");

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
    fetchUser();
  }, [apiService, token, userId, router]);

  const borderItem = currentUser?.equippedBorder ? getCosmeticById(currentUser.equippedBorder) : null;

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

          <div className="g-card dash-matches-card">
            <h3 className="g-section-title">Recent Matches</h3>
            <p className="dash-muted-text">No games played yet.</p>
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
              <div className="dash-stat-box"><span className="dash-stat-value">{currentUser.score ?? 0}</span><span className="dash-stat-label">Score</span></div>
              <div className="dash-stat-box"><span className="dash-stat-value">{currentUser.level ?? 0}</span><span className="dash-stat-label">Level</span></div>
              <div className="dash-stat-box"><span className="dash-stat-value">{currentUser.xp ?? 0}</span><span className="dash-stat-label">XP</span></div>
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