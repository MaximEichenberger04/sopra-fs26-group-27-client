"use client";
import "./profile.css";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Card, Descriptions, Avatar, Button } from "antd";
import { UserOutlined } from "@ant-design/icons";

const Profile: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const apiService = useApi();
  const [user, setUser] = useState<User | null>(null);
  const { value: token } = useLocalStorage<string>("token", "");

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const fetchedUser = await apiService.get<User>(`/users/${params.id}`, token);
        setUser(fetchedUser);
      } catch (error) {
        if (error instanceof Error) {
          alert(`Could not load profile:\n${error.message}`);
        }
      }
    };

    fetchUser();
  }, [apiService, params.id, token, router]);

  return (
    <div className="auth-page">
      <div className="profile-card">
        <div className="profile-avatar-wrap">
          <Avatar
            size={88}
            src={user?.avatarURL ?? undefined}
            icon={!user?.avatarURL && <UserOutlined />}
            className="profile-avatar"
          />
        </div>
        {user && (
          <div className="profile-fields">
            <div className="profile-row">
              <span className="profile-label">Username</span>
              <span className="profile-value">{user.username}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Display Name</span>
              <span className="profile-value">{user.displayName}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Status</span>
              <span className={user.status === "ONLINE" ? "profile-value profile-online" : "profile-value profile-offline"}>
                {user.status}
              </span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Member Since</span>
              <span className="profile-value">{user.creationDate}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Bio</span>
              <span className="profile-value profile-bio">{user.biography ?? "—"}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Score</span>
              <span className="profile-value">{user.score ?? 0}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">XP</span>
              <span className="profile-value">{user.xp ?? 0}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Level</span>
              <span className="profile-value">{user.level ?? 0}</span>
            </div>
          </div>
        )}
        <Button className="auth-btn-secondary" style={{ marginTop: 24 }} onClick={() => router.back()}>
          Back
        </Button>
      </div>
    </div>
  );

};

export default Profile;
