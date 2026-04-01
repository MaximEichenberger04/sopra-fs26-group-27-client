"use client";

import "./profile.css";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Avatar, Button, Input, message } from "antd";
import { UserOutlined, CameraOutlined } from "@ant-design/icons";

const { TextArea } = Input;

const Profile: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const apiService = useApi();
  const [user, setUser] = useState<User | null>(null);
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
        const fetchedUser = await apiService.get<User>(
          `/users/${params.id}`
        );
        setUser(fetchedUser);
        // Populate edit fields
        setEditUsername(fetchedUser.username ?? "");
        setEditDisplayName(fetchedUser.displayName ?? "");
        setEditBiography(fetchedUser.biography ?? "");
      } catch (error) {
        if (error instanceof Error) {
          alert(`Could not load profile:\n${error.message}`);
        }
      }
    };

    fetchUser();
  }, [apiService, params.id, token, router]);

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

    // Build payload with only changed fields
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

    // Password validation
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
      await apiService.put<User>(
        `/users/${params.id}`,
        payload
      );
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

  /** Cancel — go back to dashboard */
  const handleCancel = () => {
    router.push("/users");
  };

  /** Handle avatar file selection */
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

  if (!user) return null;

  // ═══════════════════════════════════════════════
  // OWNER VIEW — Edit Profile form
  // ═══════════════════════════════════════════════
  if (isOwner) {
    return (
      <div className="auth-page">
        {contextHolder}
        <div className="profile-card edit-mode">
          <h1 className="edit-title">Edit Profile</h1>

          {/* Avatar */}
          <div className="edit-avatar-section">
            <div
              className="edit-avatar-wrap"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar
                size={88}
                src={previewAvatar ?? user.avatarURL ?? undefined}
                icon={!user.avatarURL && !previewAvatar && <UserOutlined />}
                className="profile-avatar"
              />
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
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // OTHER USER VIEW — Read-only profile
  // ═══════════════════════════════════════════════
  return (
    <div className="auth-page">
      {contextHolder}
      <div className="profile-card view-mode">
        <div className="view-avatar-wrap">
          <Avatar
            size={96}
            src={user.avatarURL ?? undefined}
            icon={!user.avatarURL && <UserOutlined />}
            className="profile-avatar"
          />
        </div>

        <h1 className="view-display-name">{user.displayName}</h1>

        <p className="view-subtitle">
          Member since {user.creationDate} · Level {user.level ?? 0}
        </p>

        <div className="view-xp-section">
          <div className="view-xp-bar-bg">
            <div
              className="view-xp-bar-fill"
              style={{
                width: `${Math.min(((user.xp ?? 0) % 1000) / 10, 100)}%`,
              }}
            />
          </div>
          <span className="view-xp-text">{user.xp ?? 0} XP</span>
        </div>

        {user.biography && (
          <p className="view-bio">&ldquo;{user.biography}&rdquo;</p>
        )}

        <div className="view-stats">
          <div className="view-stat-box">
            <span className="view-stat-value">{user.score ?? 0}</span>
            <span className="view-stat-label">Score</span>
          </div>
          <div className="view-stat-box">
            <span className="view-stat-value">{user.level ?? 0}</span>
            <span className="view-stat-label">Level</span>
          </div>
          <div className="view-stat-box">
            <span className="view-stat-value">{user.xp ?? 0}</span>
            <span className="view-stat-label">XP</span>
          </div>
        </div>

        <Button
          className="auth-btn-secondary"
          style={{ marginTop: 28 }}
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>
    </div>
  );
};

export default Profile;