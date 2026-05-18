import { CellValue, MATRIX_SIZE, WALL_VALUE } from "@/types/game";

/**
 * Computes which wall placements are valid for the current board state.
 * Returns a Set of "cr,cc,ORIENTATION" strings where (cr,cc) is the CENTER (odd,odd).
 *
 * HORIZONTAL center (cr,cc): occupies [cr][cc-1], [cr][cc], [cr][cc+1]
 * VERTICAL   center (cr,cc): occupies [cr-1][cc], [cr][cc], [cr+1][cc]
 */
export function getValidWallSet(matrix: CellValue[][]): Set<string> {
  const valid = new Set<string>();
  for (let cr = 1; cr < MATRIX_SIZE; cr += 2) {
    for (let cc = 1; cc < MATRIX_SIZE; cc += 2) {
      if (checkValid(matrix, cr, cc, "HORIZONTAL")) valid.add(`${cr},${cc},HORIZONTAL`);
      if (checkValid(matrix, cr, cc, "VERTICAL"))   valid.add(`${cr},${cc},VERTICAL`);
    }
  }
  return valid;
}

/**
 * Returns the single wall center that a hovered slot belongs to.
 *
 * For a HORIZONTAL wall slot at (mr, mc):
 *   mr is always odd (horizontal slot row)
 *   mc odd  → slot IS the center pillar → center = (mr, mc)
 *   mc even → slot is a SIDE segment.
 *             Convention: even mc is the LEFT segment of the wall at (mr, mc+1).
 *             This is consistent: hovering any part of a wall shows that wall,
 *             and two adjacent walls don't fight over the shared even cell.
 *
 * For a VERTICAL wall slot at (mr, mc):
 *   mc is always odd
 *   mr odd  → slot IS the center pillar → center = (mr, mc)
 *   mr even → slot is the TOP segment of the wall at (mr+1, mc).
 */
export function slotToCenter(
  mr: number,
  mc: number,
  orientation: "HORIZONTAL" | "VERTICAL"
): [number, number] {
  if (orientation === "HORIZONTAL") {
    // mc odd = center, mc even = left segment → center is mc+1
    const cc = mc % 2 === 1 ? mc : mc + 1;
    return [mr, cc];
  } else {
    // mr odd = center, mr even = top segment → center is mr+1
    const cr = mr % 2 === 1 ? mr : mr + 1;
    return [cr, mc];
  }
}

function checkValid(
  matrix: CellValue[][],
  cr: number,
  cc: number,
  orientation: "HORIZONTAL" | "VERTICAL"
): boolean {
  const cells: Array<[number, number]> = orientation === "HORIZONTAL"
    ? [[cr, cc - 1], [cr, cc], [cr, cc + 1]]
    : [[cr - 1, cc], [cr, cc], [cr + 1, cc]];

  for (const [r, c] of cells) {
    if (r < 0 || r >= MATRIX_SIZE || c < 0 || c >= MATRIX_SIZE) return false;
    if ((matrix[r]?.[c] ?? 0) === WALL_VALUE) return false;
  }

  const sim: CellValue[][] = matrix.map(row => [...row] as CellValue[]);
  for (const [r, c] of cells) sim[r][c] = WALL_VALUE;

  return canReachGoalRow(sim, 1, 0)
    && canReachGoalRow(sim, 2, MATRIX_SIZE - 1)
    && canReachGoalCol(sim, 3, 0)
    && canReachGoalCol(sim, 4, MATRIX_SIZE - 1);
}

function canReachGoalRow(matrix: CellValue[][], player: 1 | 2 | 3 | 4, goalRow: number): boolean {
  return canReach(matrix, player, goalRow, null);
}

function canReachGoalCol(matrix: CellValue[][], player: 1 | 2 | 3 | 4, goalCol: number): boolean {
  return canReach(matrix, player, null, goalCol);
}

function canReach(
  matrix: CellValue[][],
  player: 1 | 2 | 3 | 4,
  goalRow: number | null,
  goalCol: number | null
): boolean {
  let sr = -1, sc = -1;
  outer:
  for (let r = 0; r < MATRIX_SIZE; r += 2) {
    for (let c = 0; c < MATRIX_SIZE; c += 2) {
      if (matrix[r]?.[c] === player) { sr = r; sc = c; break outer; }
    }
  }
  if (sr === -1) return true;

  const visited = new Set<string>();
  const queue: Array<[number, number]> = [[sr, sc]];
  visited.add(`${sr},${sc}`);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if ((goalRow !== null && r === goalRow) || (goalCol !== null && c === goalCol)) return true;
    for (const [dr, dc] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as [number, number][]) {
      const wr = r + dr / 2;
      const wc = c + dc / 2;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= MATRIX_SIZE || nc < 0 || nc >= MATRIX_SIZE) continue;
      if ((matrix[wr]?.[wc] ?? 0) === WALL_VALUE) continue;
      const key = `${nr},${nc}`;
      if (!visited.has(key)) { visited.add(key); queue.push([nr, nc]); }
    }
  }
  return false;
}
