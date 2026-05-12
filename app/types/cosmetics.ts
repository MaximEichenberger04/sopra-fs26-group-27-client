export interface CosmeticItem {
    id: string;
    name: string;
    type: "border" | "pawn";
    price: number;
    cssClass: string;
}

export const COSMETICS: CosmeticItem[] = [
    // Avatar Borders (12 image-based rings)
    { id: "border-wood", name: "Wood", type: "border", price: 1800, cssClass: "ring-wood" },
    { id: "border-builder", name: "Builder", type: "border", price: 1800, cssClass: "ring-builder" },
    { id: "border-slime", name: "Slime", type: "border", price: 1800, cssClass: "ring-slime" },
    { id: "border-emerald", name: "Emerald", type: "border", price: 3000, cssClass: "ring-emerald" },
    { id: "border-ice", name: "Ice", type: "border", price: 3000, cssClass: "ring-ice" },
    { id: "border-knight", name: "Knight", type: "border", price: 3000, cssClass: "ring-knight" },
    { id: "border-fire", name: "Fire", type: "border", price: 4800, cssClass: "ring-fire" },
    { id: "border-shadow", name: "Shadow", type: "border", price: 4800, cssClass: "ring-shadow" },
    { id: "border-royal", name: "Royal", type: "border", price: 4800, cssClass: "ring-royal" },
    { id: "border-diamond", name: "Diamond", type: "border", price: 7200, cssClass: "ring-diamond" },
    { id: "border-wizard", name: "Wizard", type: "border", price: 7200, cssClass: "ring-wizard" },
    { id: "border-rainbow", name: "Rainbow", type: "border", price: 99999, cssClass: "ring-rainbow" },

    // Pawn Skins (image-based)
    { id: "pawn-angel", name: "Angel", type: "pawn", price: 1800, cssClass: "pskin-angel" },
    { id: "pawn-builder", name: "Builder", type: "pawn", price: 1800, cssClass: "pskin-builder" },
    { id: "pawn-frog", name: "Frog", type: "pawn", price: 1800, cssClass: "pskin-frog" },
    { id: "pawn-king", name: "King", type: "pawn", price: 4800, cssClass: "pskin-king" },
    { id: "pawn-knight", name: "Knight", type: "pawn", price: 3000, cssClass: "pskin-knight" },
    { id: "pawn-wealthy", name: "Wealthy", type: "pawn", price: 7200, cssClass: "pskin-wealthy" },
    { id: "pawn-witch", name: "Witch", type: "pawn", price: 3000, cssClass: "pskin-witch" },
    { id: "pawn-wizard", name: "Wizard", type: "pawn", price: 4800, cssClass: "pskin-wizard" },
    { id: "pawn-wolf", name: "Wolf", type: "pawn", price: 3000, cssClass: "pskin-wolf" },
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

/** Get the pawn skin image path for a pawn cosmetic */
export function getPawnSkinImagePath(cosmeticId: string): string | null {
    const name = cosmeticId.replace("pawn-", "");
    return `/cosmetics/pawnskins/${name}.png`;
}