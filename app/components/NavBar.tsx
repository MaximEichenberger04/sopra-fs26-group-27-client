"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import Image from "next/image";

const NavBar: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { value: token, clear: clearToken } = useLocalStorage<string>("token", "");
    const { value: userId } = useLocalStorage<string>("userId", "");

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!token || !userId) return;
        const fetchUser = async () => {
            try {
                const user = await apiService.get<User>(`/users/${userId}`);
                setCurrentUser(user);
            } catch {
                // silently fail
            }
        };
        fetchUser();
    }, [apiService, token, userId]);

    
  async function handleLogout() {
    try {
      await apiService.put("/logout", {});
    } catch {

    } finally {
      clearToken();
      router.push("/login");
    }
  }

    return (
        <nav className="nav-bar">
            <div className="nav-left" onClick={() => router.push("/users")} style={{ cursor: "pointer" }}>
                <Image src="/quoridor.png" alt="Quoridor" width={220} height={60} className="nav-logo-img" priority />
            </div>
            <div className="nav-right" ref={dropdownRef}>
                {currentUser && (
                    <>
                        <button
                            className="nav-user-btn"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            type="button"
                        >
                            <Avatar
                                size={30}
                                src={currentUser.avatarURL ?? undefined}
                                icon={!currentUser.avatarURL && <UserOutlined />}
                                className="nav-avatar"
                            />
                            <span className="nav-user-name">{currentUser.displayName}</span>
                            <span className="nav-caret">▾</span>
                        </button>
                        {dropdownOpen && (
                            <div className="nav-dropdown">
                                <button className="nav-dd-item" onClick={() => { setDropdownOpen(false); router.push(`/users/${userId}`); }}>
                                    Profile
                                </button>
                                <button className="nav-dd-item nav-dd-disabled">Cosmetics Shop</button>
                                <button className="nav-dd-item nav-dd-disabled">Match History</button>
                                <div className="nav-dd-divider" />
                                <button className="nav-dd-item nav-dd-logout" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </nav>
    );
};

export default NavBar;