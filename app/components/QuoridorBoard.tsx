import React from "react";
import { CellValue, BOARD_CELLS, MATRIX_SIZE } from "@/types/game";

// ── Sizing constants ──────────────────────────────────────────
const CELL  = 52;   // px — pawn cell
const WALL  = 9;    // px — wall slot thickness (the 3-slot span fills CELL + WALL + CELL visually, but each unit is WALL wide)
const GAP   = 0;

// ── Colour tokens (CSS variables so dark mode works) ──────────
const C = {
  cell:        "var(--q-cell,        #2e2a22)", 
  cellBorder:  "var(--q-cell-border, #4a4438)",
  wallEmpty:   "var(--q-wall-empty,  #1e1c18)",
  wallActive:  "var(--q-wall-active, #c8a44a)",
  pillarEmpty: "var(--q-pillar,      #181612)",
  pillarActive:"var(--q-wall-active, #c8a44a)",
  p1:          "var(--q-p1,          #5b8dd9)",
  p2:          "var(--q-p2,          #d96b6b)",
  pawnRing:    "rgba(255,255,255,0.30)",
  pawnShine:   "rgba(255,255,255,0.22)",
};

// ── Sub-components ────────────────────────────────────────────

function PawnCell({ value }: { value: CellValue }) {
  return (
    <div style={{
      width: CELL, height: CELL,
      background: C.cell,
      border: `0.5px solid ${C.cellBorder}`,
      borderRadius: 5,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxSizing: "border-box",
    }}>
      {(value === 1 || value === 2) && (
        <div style={{ position: "relative", width: CELL * 0.62, height: CELL * 0.62 }}>
          {/* Body */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: value === 1 ? C.p1 : C.p2,
            border: `2.5px solid ${C.pawnRing}`,
          }} />
          {/* Shine */}
          <div style={{
            position: "absolute",
            top: "14%", left: "16%",
            width: "35%", height: "28%",
            borderRadius: "50%",
            background: C.pawnShine,
            transform: "rotate(-20deg)",
          }} />
        </div>
      )}
    </div>
  );
}

function WallSlot({
  orientation, value,
}: {
  orientation: "horizontal" | "vertical";
  value: CellValue;
}) {
  const active = value === 3;
  const isH = orientation === "horizontal";
  return (
    <div style={{
      width:      isH ? CELL  : WALL,
      height:     isH ? WALL  : CELL,
      background: active ? C.wallActive : C.wallEmpty,
      borderRadius: 2,
      transition: "background 0.12s",
    }} />
  );
}

function Pillar({ value }: { value: CellValue }) {
  const active = value === 3;
  return (
    <div style={{
      width: WALL, height: WALL,
      background: active ? C.pillarActive : C.pillarEmpty,
      borderRadius: 2,
      transition: "background 0.12s",
    }} />
  );
}

// ── Main board ────────────────────────────────────────────────

interface QuoridorBoardProps {
  matrix: CellValue[][];
}

export default function QuoridorBoard({ matrix }: QuoridorBoardProps) {
  return (
    <div style={{
      display: "inline-grid",
      gridTemplateColumns: Array.from({ length: MATRIX_SIZE }, (_, i) =>
        i % 2 === 0 ? `${CELL}px` : `${WALL}px`
      ).join(" "),
      gridTemplateRows: Array.from({ length: MATRIX_SIZE }, (_, i) =>
        i % 2 === 0 ? `${CELL}px` : `${WALL}px`
      ).join(" "),
      gap: GAP,
    }}>
      {Array.from({ length: MATRIX_SIZE }, (_, mr) =>
        Array.from({ length: MATRIX_SIZE }, (_, mc) => {
          const value: CellValue = (matrix[mr]?.[mc] ?? 0) as CellValue;
          const evenRow = mr % 2 === 0;
          const evenCol = mc % 2 === 0;

          // Pawn cell
          if (evenRow && evenCol)
            return <PawnCell key={`${mr}-${mc}`} value={value} />;

          // Horizontal wall slot (odd row, even col)
          if (!evenRow && evenCol)
            return <WallSlot key={`${mr}-${mc}`} orientation="horizontal" value={value} />;

          // Vertical wall slot (even row, odd col)
          if (evenRow && !evenCol)
            return <WallSlot key={`${mr}-${mc}`} orientation="vertical" value={value} />;

          // Pillar — corner intersection (odd row, odd col)
          return <Pillar key={`${mr}-${mc}`} value={value} />;
        })
      )}
    </div>
  );
}