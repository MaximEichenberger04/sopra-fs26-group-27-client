export interface CosmeticItem {
    id: string;
    name: string;
    type: "border" | "pawn";
    price: number;
    cssClass: string;
}

export const COSMETICS: CosmeticItem[] = [
    // Avatar Borders (12 image-based rings)
    { id: "border-wood", name: "Wood", type: "border", price: 300, cssClass: "ring-wood" },
    { id: "border-builder", name: "Builder", type: "border", price: 300, cssClass: "ring-builder" },
    { id: "border-slime", name: "Slime", type: "border", price: 300, cssClass: "ring-slime" },
    { id: "border-emerald", name: "Emerald", type: "border", price: 500, cssClass: "ring-emerald" },
    { id: "border-ice", name: "Ice", type: "border", price: 500, cssClass: "ring-ice" },
    { id: "border-knight", name: "Knight", type: "border", price: 500, cssClass: "ring-knight" },
    { id: "border-fire", name: "Fire", type: "border", price: 800, cssClass: "ring-fire" },
    { id: "border-shadow", name: "Shadow", type: "border", price: 800, cssClass: "ring-shadow" },
    { id: "border-royal", name: "Royal", type: "border", price: 800, cssClass: "ring-royal" },
    { id: "border-diamond", name: "Diamond", type: "border", price: 1200, cssClass: "ring-diamond" },
    { id: "border-wizard", name: "Wizard", type: "border", price: 1200, cssClass: "ring-wizard" },
    { id: "border-rainbow", name: "Rainbow", type: "border", price: 99999, cssClass: "ring-rainbow" },

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

/** Get the ring image path for a border cosmetic */
export function getRingImagePath(cosmeticId: string): string | null {
    const name = cosmeticId.replace("border-", "");
    return `/cosmetics/borderrings/${name}.png`;
}