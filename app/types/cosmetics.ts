export interface CosmeticItem {
    id: string;
    name: string;
    type: "border" | "pawn";
    price: number;
    cssClass: string;
}

export const COSMETICS: CosmeticItem[] = [
    // Avatar Borders
    { id: "border-crimson", name: "Crimson Ring", type: "border", price: 300, cssClass: "ring-crimson" },
    { id: "border-emerald", name: "Emerald Ring", type: "border", price: 300, cssClass: "ring-emerald" },
    { id: "border-royal", name: "Royal Ring", type: "border", price: 300, cssClass: "ring-royal" },
    { id: "border-fire", name: "Fire Ring", type: "border", price: 500, cssClass: "ring-fire" },
    { id: "border-ice", name: "Ice Ring", type: "border", price: 500, cssClass: "ring-ice" },
    { id: "border-rainbow", name: "Rainbow Ring", type: "border", price: 1000, cssClass: "ring-rainbow" },
    { id: "border-shadow", name: "Shadow Ring", type: "border", price: 800, cssClass: "ring-shadow" },

    // Pawn Skins
    { id: "pawn-lava", name: "Lava", type: "pawn", price: 400, cssClass: "pskin-lava" },
    { id: "pawn-ocean", name: "Ocean", type: "pawn", price: 400, cssClass: "pskin-ocean" },
    { id: "pawn-galaxy", name: "Galaxy", type: "pawn", price: 600, cssClass: "pskin-galaxy" },
    { id: "pawn-forest", name: "Forest", type: "pawn", price: 400, cssClass: "pskin-forest" },
    { id: "pawn-diamond", name: "Diamond", type: "pawn", price: 800, cssClass: "pskin-diamond" },
    { id: "pawn-gold", name: "Royal Gold", type: "pawn", price: 1200, cssClass: "pskin-gold" },
    { id: "pawn-void", name: "Void", type: "pawn", price: 600, cssClass: "pskin-void" },
    { id: "pawn-rose", name: "Rose", type: "pawn", price: 400, cssClass: "pskin-rose" },
];

export function getCosmeticById(id: string): CosmeticItem | undefined {
    return COSMETICS.find((c) => c.id === id);
}

export function getOwnedCosmetics(ownedStr: string | null): string[] {
    if (!ownedStr) return [];
    return ownedStr.split(",").filter((s) => s.trim() !== "");
}