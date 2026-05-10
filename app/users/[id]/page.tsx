"use client";

import "./profile.css";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User, Achievement } from "@/types/user";
import { COSMETICS, CosmeticItem, getOwnedCosmetics, getCosmeticById } from "@/types/cosmetics";
import { Avatar, Button, Input, message } from "antd";
import { UserOutlined, CameraOutlined } from "@ant-design/icons";
import NavBar from "@/components/NavBar";

const { TextArea } = Input;

// ─── Match history types ──────────────────────────────────────────────
interface MatchRecord {
  id: number;
  gameId: number;
  opponentUsernames: string;
  gameMode: string;
  won: boolean;
  playedAt: string;
  opponentAvatarURL?: string | null;
  opponentBorder?: string | null; // equippedBorder id of opponent
}

interface UserStatistics {
  totalGames: number;
  wins: number;
  losses: number;
  winLossRatio: number;
  mostPlayedGameMode: string | null;
}

// ─── Coin SVG icon ────────────────────────────────────────────────────
const CoinIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "inline-block", verticalAlign: "middle" }}
  >
    <circle cx="12" cy="12" r="10" fill="#c8a832" opacity="0.18" />
    <circle cx="12" cy="12" r="10" stroke="#c8a832" strokeWidth="1.5" />
    <text
      x="12"
      y="16.5"
      textAnchor="middle"
      fontSize="14"
      fontWeight="700"
      fill="#c8a832"
      fontFamily="serif"
    >
      $
    </text>
  </svg>
);

const Profile: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const apiService = useApi();
  const [user, setUser] = useState<User | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [matchHistoryError, setMatchHistoryError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const { value: token } = useLocalStorage<string>("token", "");
  const { value: loggedInUserId } = useLocalStorage<string>("userId", "");

  const isOwner = Boolean(
    loggedInUserId && params.id && String(loggedInUserId) === String(params.id)
  );

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Edit form values (used in owner view)
  const [editUsername, setEditUsername] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBiography, setEditBiography] = useState("");
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  // Password change (collapsible)
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const [fetchedUser, fetchedAchievements] = await Promise.all([
          apiService.get<User>(`/users/${params.id}`),
          apiService.get<Achievement[]>(`/users/${params.id}/achievements`),
        ]);
        setUser(fetchedUser);
        setAchievements(fetchedAchievements);
        setEditUsername(fetchedUser.username ?? "");
        setEditDisplayName(fetchedUser.displayName ?? "");
        setEditBiography(fetchedUser.biography ?? "");
      } catch (error) {
        if (error instanceof Error) {
          alert(`Could not load profile:\n${error.message}`);
        }
      }
    };

    const fetchMatchHistory = async () => {
      try {
        // Adjust this endpoint to match your actual backend route
        const history = await apiService.get<MatchRecord[]>(`/users/${params.id}/match-history`);
        setMatchHistory(history);
        setMatchHistoryError(null);
      } catch (error) {
        // Match history is non-critical — fail silently
        setMatchHistory([]);
        setMatchHistoryError(error instanceof Error ? error.message : "Could not load match history.");
      }
    };

    const fetchStatistics = async () => {
      try {
        const fetchedStatistics = await apiService.get<UserStatistics>(`/users/${params.id}/statistics`);
        setStatistics(fetchedStatistics);
      } catch {
        setStatistics(null);
      }
    };

    fetchUser();
    fetchStatistics();
    fetchMatchHistory();
  }, [apiService, params.id, token, router, isOwner]);

  /** Save all changes at once */
  const handleSaveChanges = async () => {
    if (!editDisplayName.trim()) {
      messageApi.error("Display name cannot be empty.");
      return;
    }
    if (!editUsername.trim()) {
      messageApi.error("Username cannot be empty.");
      return;
    }

    const payload: Record<string, string> = {};

    if (editUsername.trim() !== (user?.username ?? "")) {
      payload.username = editUsername.trim();
    }
    if (editDisplayName.trim() !== (user?.displayName ?? "")) {
      payload.displayName = editDisplayName.trim();
    }
    if (editBiography.trim() !== (user?.biography ?? "")) {
      payload.biography = editBiography.trim();
    }
    if (previewAvatar) {
      payload.avatarURL = previewAvatar;
    }

    if (showPasswordChange && (currentPassword || newPassword || confirmPassword)) {
      if (!currentPassword.trim()) {
        messageApi.error("Please enter your current password.");
        return;
      }
      if (!newPassword.trim()) {
        messageApi.error("Please enter a new password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        messageApi.error("Passwords do not match.");
        return;
      }
      payload.currentPassword = currentPassword;
      payload.password = newPassword;
    }

    if (Object.keys(payload).length === 0) {
      messageApi.info("No changes to save.");
      return;
    }

    setIsSaving(true);
    try {
      await apiService.patch<User>(`/users/${params.id}`, payload);
      messageApi.success("Profile updated!");
      setTimeout(() => {
        router.push("/users");
      }, 500);
    } catch (error) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/users");
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      messageApi.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      messageApi.error("Image must be smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleEquip = async (item: CosmeticItem) => {
    try {
      const field = item.type === "border" ? "equippedBorder" : "equippedPawnSkin";
      const response = await apiService.patch<User>(`/users/${params.id}`, { [field]: item.id });
      setUser(response);
      window.dispatchEvent(new Event("cosmetic-changed"));
      messageApi.success(`${item.name} equipped!`);
    } catch {
      messageApi.error("Failed to equip cosmetic.");
    }
  };

  const handleRemove = async (type: "border" | "pawn") => {
    try {
      const field = type === "border" ? "equippedBorder" : "equippedPawnSkin";
      const response = await apiService.patch<User>(`/users/${params.id}`, { [field]: "" });
      setUser(response);
      window.dispatchEvent(new Event("cosmetic-changed"));
      messageApi.success("Cosmetic removed!");
    } catch {
      messageApi.error("Failed to remove cosmetic.");
    }
  };

  const formatMatchDate = (playedAt?: string) => {
    if (!playedAt) return "";
    const date = new Date(playedAt);
    if (Number.isNaN(date.getTime())) return playedAt;
    return date.toLocaleDateString();
  };

  const getPlayerCount = (opponentUsernames?: string | null) => {
    if (!opponentUsernames?.trim()) return 2;
    return opponentUsernames.split(",").filter((name) => name.trim()).length + 1;
  };

  if (!user) return null;

  const owned = getOwnedCosmetics(user.ownedCosmetics);
  const ownedBorders = COSMETICS.filter((c) => c.type === "border" && owned.includes(c.id));
  const ownedPawns = COSMETICS.filter((c) => c.type === "pawn" && owned.includes(c.id));
  const equippedBorderItem = user.equippedBorder ? getCosmeticById(user.equippedBorder) : null;
  const equippedPawnItem = user.equippedPawnSkin ? getCosmeticById(user.equippedPawnSkin) : null;
  const avatarRingClass = equippedBorderItem ? equippedBorderItem.cssClass : "";

  // ── XP / Level helpers ──────────────────────────────────────────────
  const xpIntoLevel = user.xpCurrentLevelProgress ?? 0;
  const xpPerLevel = user.xpRequiredForNextLevel ?? 130;
  const xpPercent = xpPerLevel > 0 ? Math.min((xpIntoLevel / xpPerLevel) * 100, 100) : 0;

  // ── Win / Loss from match history ───────────────────────────────────
  const wins = statistics?.wins ?? matchHistory.filter((m) => m.won).length;
  const losses = statistics?.losses ?? matchHistory.filter((m) => !m.won).length;
  const ownWins = statistics?.wins ?? 0;
  const ownLosses = statistics?.losses ?? 0;
  const ownTotalGames = statistics?.totalGames ?? 0;
  const ownWinRate = Math.round((statistics?.winLossRatio ?? 0) * 100);
  const ownMostPlayedMode = statistics?.mostPlayedGameMode ?? "None";

  // ═══════════════════════════════════════════════
  // OWNER VIEW
  // ═══════════════════════════════════════════════
  if (isOwner) {
    return (
      <div>
        <NavBar />
        <div className="auth-page">
          {contextHolder}
          <div className="profile-layout">
            <div className="profile-card edit-mode">
              <h1 className="edit-title">Edit Profile</h1>

              {/* Avatar */}
              <div className="edit-avatar-section">
                <div
                  className="edit-avatar-wrap"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={`avatar-ring-wrap ${avatarRingClass}`}>
                    <Avatar
                      size={88}
                      src={previewAvatar ?? user.avatarURL ?? undefined}
                      icon={!user.avatarURL && !previewAvatar && <UserOutlined />}
                      className="profile-avatar"
                    />
                  </div>
                  <div className="edit-avatar-overlay">
                    <CameraOutlined style={{ fontSize: 20 }} />
                    <span>Change</span>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: "none" }}
                />
              </div>

              {/* Username */}
              <div className="edit-field">
                <label className="edit-label">Username</label>
                <Input
                  className="edit-input"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>

              {/* Display Name */}
              <div className="edit-field">
                <label className="edit-label">Display Name</label>
                <Input
                  className="edit-input"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Enter display name"
                />
              </div>

              {/* Biography */}
              <div className="edit-field">
                <label className="edit-label">Biography</label>
                <TextArea
                  className="edit-input edit-textarea"
                  value={editBiography}
                  onChange={(e) => setEditBiography(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>

              {/* Change Password (collapsible) */}
              <div className="edit-password-section">
                <button
                  className="edit-password-toggle"
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  type="button"
                >
                  {showPasswordChange ? "▼" : "►"} Change Password
                </button>

                {showPasswordChange && (
                  <div className="edit-password-fields">
                    <div className="edit-field">
                      <label className="edit-label">Current Password</label>
                      <Input.Password
                        className="edit-input"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current Password"
                      />
                    </div>
                    <div className="edit-field">
                      <label className="edit-label">New Password</label>
                      <Input.Password
                        className="edit-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password"
                      />
                      {showPasswordChange && newPassword.length > 0 && (
                        <div className="edit-password-rules">
                          {newPassword.length < 8 && (
                            <p className="edit-rule-error">Must be at least 8 characters long.</p>
                          )}
                          {!/[A-Z]/.test(newPassword) && (
                            <p className="edit-rule-error">Must contain at least one uppercase letter.</p>
                          )}
                          {!/[0-9]/.test(newPassword) && (
                            <p className="edit-rule-error">Must contain at least one number.</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="edit-field">
                      <label className="edit-label">Confirm New Password</label>
                      <Input.Password
                        className="edit-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm New Password"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="edit-actions">
                <Button
                  className="auth-btn-primary"
                  onClick={handleSaveChanges}
                  loading={isSaving}
                >
                  Save Changes
                </Button>
                <Button className="auth-btn-secondary" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>

            {/* Right Cosmetics Panel */}
            <div className="cosmetics-panel">
              <div className="owner-statistics-panel">
                <h2 className="cosmetics-panel-title">My Statistics</h2>
                <div className="owner-statistics-grid">
                  <div className="owner-stat-box">
                    <span className="owner-stat-value">{ownTotalGames}</span>
                    <span className="owner-stat-label">Games</span>
                  </div>
                  <div className="owner-stat-box">
                    <span className="owner-stat-value owner-stat-wins">{ownWins}</span>
                    <span className="owner-stat-label">Wins</span>
                  </div>
                  <div className="owner-stat-box">
                    <span className="owner-stat-value owner-stat-losses">{ownLosses}</span>
                    <span className="owner-stat-label">Losses</span>
                  </div>
                  <div className="owner-stat-box">
                    <span className="owner-stat-value">{ownWinRate}%</span>
                    <span className="owner-stat-label">Win Rate</span>
                  </div>
                </div>
                <div className="owner-stat-mode">
                  <span className="owner-stat-label">Most Played</span>
                  <span className="owner-stat-mode-value">{ownMostPlayedMode}</span>
                </div>
              </div>

              <div className="cosmetics-panel-header">
                <h2 className="cosmetics-panel-title">My Cosmetics</h2>
                <span className="cosmetics-coins">{user.coins ?? 0} coins</span>
              </div>

              <button className="btn-outline cosmetics-shop-link" onClick={() => router.push("/shop")}>
                Go to Shop
              </button>

              {/* Equipped Cosmetics */}
              <div className="cosmetics-section">
                <h3 className="g-section-title">Equipped</h3>
                <div className="equipped-grid">
                  <div className="equipped-slot">
                    <span className="equipped-slot-label">Border</span>
                    {equippedBorderItem ? (
                      <>
                        <div className={`cosmetic-preview-ring ${equippedBorderItem.cssClass}`}>
                          <div className="cosmetic-preview-inner" />
                        </div>
                        <span className="equipped-slot-name">{equippedBorderItem.name}</span>
                        <button className="cosmetics-remove-btn" onClick={() => handleRemove("border")}>Remove</button>
                      </>
                    ) : (
                      <span className="equipped-slot-empty">None</span>
                    )}
                  </div>
                  <div className="equipped-slot">
                    <span className="equipped-slot-label">Pawn Skin</span>
                    {equippedPawnItem ? (
                      <>
                        <div className={`cosmetic-preview-pawn ${equippedPawnItem.cssClass}`} />
                        <span className="equipped-slot-name">{equippedPawnItem.name}</span>
                        <button className="cosmetics-remove-btn" onClick={() => handleRemove("pawn")}>Remove</button>
                      </>
                    ) : (
                      <span className="equipped-slot-empty">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Owned Borders */}
              <div className="cosmetics-section">
                <h3 className="g-section-title">Borders ({ownedBorders.length})</h3>
                {ownedBorders.length === 0 ? (
                  <p className="cosmetics-empty">No borders owned yet.</p>
                ) : (
                  <div className="cosmetics-grid">
                    {ownedBorders.map((item) => (
                      <div
                        key={item.id}
                        className={`cosmetic-item ${user.equippedBorder === item.id ? "cosmetic-equipped" : ""}`}
                      >
                        <div className={`cosmetic-preview-ring ${item.cssClass}`}>
                          <div className="cosmetic-preview-inner" />
                        </div>
                        <span className="cosmetic-item-name">{item.name}</span>
                        {user.equippedBorder === item.id ? (
                          <span className="cosmetic-badge-equipped">Equipped</span>
                        ) : (
                          <button className="cosmetic-equip-btn" onClick={() => handleEquip(item)}>Equip</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="cosmetics-section">
                <h3 className="g-section-title">Pawn Skins ({ownedPawns.length})</h3>
                {ownedPawns.length === 0 ? <p className="cosmetics-empty">No pawn skins owned yet.</p> : (
                  <div className="cosmetics-grid">
                    {ownedPawns.map((item) => (
                      <div key={item.id} className={`cosmetic-item ${user.equippedPawnSkin === item.id ? "cosmetic-equipped" : ""}`}>
                        <div className={`cosmetic-preview-pawn ${item.cssClass}`} />
                        <span className="cosmetic-item-name">{item.name}</span>
                        {user.equippedPawnSkin === item.id
                          ? <span className="cosmetic-badge-equipped">Equipped</span>
                          : <button className="cosmetic-equip-btn" onClick={() => handleEquip(item)}>Equip</button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Achievements */}
              <div className="cosmetics-section">
                <h3 className="g-section-title">Achievements ({achievements.length})</h3>
                {achievements.length === 0 ? (
                  <p className="cosmetics-empty">No achievements unlocked yet.</p>
                ) : (
                  <div className="achievement-list">
                    {achievements.map((a) => (
                      <div key={a.id} className="achievement-item">
                        <span className="achievement-name">{a.name}</span>
                        <span className="achievement-desc">{a.description}</span>
                        <span className="achievement-reward">+{a.coinReward} coins</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // OTHER USER VIEW — Rich read-only profile
  // ═══════════════════════════════════════════════
  return (
    <div>
      <NavBar />
      <div className="auth-page">
        {contextHolder}
        <div className="view-profile-layout">

          {/* ── LEFT: Profile Card ── */}
          <div className="profile-card view-mode">

            {/* Avatar with border ring */}
            <div className="view-avatar-wrap">
              <div className={`avatar-ring-wrap ${avatarRingClass}`}>
                <Avatar
                  size={96}
                  src={user.avatarURL ?? undefined}
                  icon={!user.avatarURL && <UserOutlined />}
                  className="profile-avatar"
                />
              </div>
            </div>

            {/* Name */}
            <h1 className="view-display-name">{user.displayName}</h1>
            <p className="view-username">@{user.username}</p>

            <p className="view-subtitle">
              Member since {user.creationDate} · Level {user.level ?? 0}
            </p>

            {/* XP Progress Bar */}
            <div className="view-xp-section">
              <div className="view-xp-label-row">
                <span className="view-xp-level-tag">LVL {user.level ?? 0}</span>
                <span className="view-xp-counter">{xpIntoLevel} / {xpPerLevel} XP</span>
              </div>
              <div className="view-xp-bar-bg">
                <div className="view-xp-bar-fill" style={{ width: `${xpPercent}%` }} />
              </div>
              <div className="view-xp-threshold-row">
                <span className="view-xp-threshold">{(() => { const l = user.level ?? 1; return 130 * l * (l - 1) / 2; })()} XP</span>
                <span className="view-xp-threshold">{(() => { const l = user.level ?? 1; return 130 * (l + 1) * l / 2; })()} XP</span>
              </div>
            </div>

            {/* Stats: Score · Level · W/L */}
            <div className="view-stats">
              <div className="view-stat-box">
                <span className="view-stat-value">{user.score ?? 0}</span>
                <span className="view-stat-label">Score</span>
              </div>
              <div className="view-stat-box">
                <span className="view-stat-value">{user.level ?? 0}</span>
                <span className="view-stat-label">Level</span>
              </div>
              <div className="view-stat-box view-stat-wl">
                <div className="view-wl-row">
                  <span className="view-stat-value view-stat-wins">{wins}</span>
                  <span className="view-wl-slash">/</span>
                  <span className="view-stat-value view-stat-losses">{losses}</span>
                </div>
                <span className="view-stat-label">W / L</span>
              </div>
            </div>

            {/* Equipped Pawn + Coins */}
            <div className="view-cosmetics-row">
              {/* Equipped Pawn */}
              <div className="view-cosmetic-chip">
                <span className="view-cosmetic-chip-label">Pawn</span>
                {equippedPawnItem ? (
                  <div className="view-pawn-preview-wrap">
                    <div className={`cosmetic-preview-pawn view-pawn-lg ${equippedPawnItem.cssClass}`} />
                    <span className="view-cosmetic-chip-name">{equippedPawnItem.name}</span>
                  </div>
                ) : (
                  <span className="view-cosmetic-chip-empty">Default</span>
                )}
              </div>

              {/* Divider */}
              <div className="view-cosmetics-divider" />

              {/* Coins */}
              <div className="view-cosmetic-chip">
                <span className="view-cosmetic-chip-label">Coins</span>
                <div className="view-coins-row">
                  <CoinIcon size={18} />
                  <span className="view-coins-value">{user.coins ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Biography */}
            {user.biography && (
              <p className="view-bio">&ldquo;{user.biography}&rdquo;</p>
            )}

            <div className="view-achievements">
              <p className="view-achievements-title">Achievements ({achievements.length})</p>
              {achievements.length === 0 ? (
                <p className="cosmetics-empty" style={{ textAlign: "center" }}>No achievements unlocked yet.</p>
              ) : (
                <div className="achievement-list">
                  {achievements.map((a) => (
                    <div key={a.id} className="achievement-item">
                      <span className="achievement-name">{a.name}</span>
                      <span className="achievement-desc">{a.description}</span>
                      <span className="achievement-reward">+{a.coinReward} coins</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button className="auth-btn-secondary view-back-btn" onClick={() => router.back()}>
              ← Back
            </Button>
          </div>

          {/* ── RIGHT: Match History ── */}
          <div className="view-match-history-panel">
            <h2 className="view-match-history-title">Match History</h2>

            {matchHistoryError ? (
              <div className="view-match-empty">
                <p>{matchHistoryError}</p>
              </div>
            ) : matchHistory.length === 0 ? (
              <div className="view-match-empty">
                <p>No matches played yet.</p>
              </div>
            ) : (
              <div className="view-match-list">
                {matchHistory.map((match) => {
                  const opponentBorderItem = match.opponentBorder
                    ? getCosmeticById(match.opponentBorder)
                    : null;
                  const opponentRingClass = opponentBorderItem ? opponentBorderItem.cssClass : "";
                  const isWin = match.won;
                  const gameMode = match.gameMode?.toUpperCase() ?? "CLASSIC";
                  const playerCount = getPlayerCount(match.opponentUsernames);

                  return (
                    <div key={match.id} className={`view-match-row ${isWin ? "match-win" : "match-loss"}`}>
                      {/* Result badge */}
                      <div className={`view-match-badge ${isWin ? "badge-win" : "badge-loss"}`}>
                        {isWin ? "W" : "L"}
                      </div>

                      {/* Opponent avatar */}
                      <div className={`avatar-ring-wrap avatar-ring-sm ${opponentRingClass}`}>
                        <Avatar
                          size={36}
                          src={match.opponentAvatarURL ?? undefined}
                          icon={!match.opponentAvatarURL && <UserOutlined />}
                          className="profile-avatar"
                        />
                      </div>

                      {/* Opponent name */}
                      <div className="view-match-opponent">
                        <span className="view-match-opponent-name">
                          {match.opponentUsernames || "Unknown"}
                        </span>
                      </div>

                      {/* Game info */}
                      <div className="view-match-meta">
                        <span className={`view-match-mode ${gameMode === "CHAOS" ? "mode-chaos" : "mode-classic"}`}>
                          {gameMode === "CHAOS" ? "⚡ Chaos" : "♟ Classic"}
                        </span>
                        <span className="view-match-players">
                          {playerCount} Player-Mode
                        </span>
                      </div>

                      {/* Date */}
                      <span className="view-match-date">{formatMatchDate(match.playedAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;