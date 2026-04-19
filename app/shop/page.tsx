"use client";

import "./shop.css";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { COSMETICS, CosmeticItem, getOwnedCosmetics } from "@/types/cosmetics";
import { message } from "antd";
import NavBar from "@/components/NavBar";

const ShopPage: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();
    const [user, setUser] = useState<User | null>(null);
    const [messageApi, contextHolder] = message.useMessage();
    const [buyingId, setBuyingId] = useState<string | null>(null);

    const { value: token } = useLocalStorage<string>("token", "");
    const { value: userId } = useLocalStorage<string>("userId", "");

    useEffect(() => {
        if (!token) { router.push("/login"); return; }
        const fetchUser = async () => {
            try {
                const u = await apiService.get<User>(`/users/${userId}`);
                setUser(u);
            } catch (error) {
                if (error instanceof Error) alert(`Failed to load profile:\n${error.message}`);
            }
        };
        fetchUser();
    }, [apiService, token, userId, router]);

    const handleBuy = async (item: CosmeticItem) => {
        if (!user) return;
        const coins = user.coins ?? 0;
        if (coins < item.price) {
            messageApi.error("Not enough coins!");
            return;
        }

        setBuyingId(item.id);
        try {
            const response = await apiService.post<User>(`/users/${userId}/cosmetics/buy`, { cosmeticId: item.id });
            setUser(response);
            messageApi.success(`${item.name} purchased!`);
        } catch (error) {
            if (error instanceof Error) messageApi.error(error.message);
        } finally {
            setBuyingId(null);
        }
    };

    const handleEquip = async (item: CosmeticItem) => {
        try {
            const field = item.type === "border" ? "equippedBorder" : "equippedPawnSkin";
            const response = await apiService.patch<User>(`/users/${userId}`, { [field]: item.id });
            setUser(response);
            messageApi.success(`${item.name} equipped!`);
        } catch (error) {
            if (error instanceof Error) messageApi.error(error.message);
        }
    };

    if (!user) return null;

    const owned = getOwnedCosmetics(user.ownedCosmetics);
    const borders = COSMETICS.filter((c) => c.type === "border");
    const pawns = COSMETICS.filter((c) => c.type === "pawn");

    const renderItem = (item: CosmeticItem) => {
        const isOwned = owned.includes(item.id);
        const isEquipped =
            item.type === "border"
                ? user.equippedBorder === item.id
                : user.equippedPawnSkin === item.id;

        return (
            <div key={item.id} className={`shop-item ${isOwned ? "shop-owned" : ""} ${isEquipped ? "shop-equipped" : ""}`}>
                {/* Preview */}
                {item.type === "border" ? (
                    <div className={`shop-preview-ring ${item.cssClass}`}>
                        <div className="shop-preview-inner" />
                    </div>
                ) : (
                    <div className={`shop-preview-pawn ${item.cssClass}`} />
                )}

                <span className="shop-item-name">{item.name}</span>

                {/* Action */}
                {isEquipped ? (
                    <span className="shop-badge-equipped">Equipped</span>
                ) : isOwned ? (
                    <button className="shop-equip-btn" onClick={() => handleEquip(item)}>Equip</button>
                ) : (
                    <button
                        className="shop-buy-btn"
                        onClick={() => handleBuy(item)}
                        disabled={buyingId === item.id || (user.coins ?? 0) < item.price}
                    >
                        {buyingId === item.id ? "..." : `${item.price} coins`}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="shop-page-wrap">
            <NavBar />
            {contextHolder}
            <div className="shop-content">
                <div className="shop-header">
                    <h1 className="shop-title">Cosmetics Shop</h1>
                    <span className="shop-coins">{user.coins ?? 0} coins</span>
                </div>
                <p className="shop-subtitle">Earn coins by winning matches. Spend them on glory.</p>

                <div className="shop-category">
                    <h2 className="g-section-title">Avatar Borders</h2>
                    <div className="shop-grid">{borders.map(renderItem)}</div>
                </div>

                <div className="shop-category">
                    <h2 className="g-section-title">Pawn Skins</h2>
                    <div className="shop-grid">{pawns.map(renderItem)}</div>
                </div>

                <button className="btn-outline" style={{ marginTop: 24 }} onClick={() => router.push(`/users/${userId}`)}>
                    ← Back to Profile
                </button>
            </div>
        </div>
    );
};

export default ShopPage;