import { CellValue, MATRIX_SIZE, WALL_VALUE } from "@/types/game";

export function getValidMoves(
  matrix: CellValue[][] | undefined | null,
  playerValue: 1 | 2 | 3 | 4
): Array<[number, number]> {
  if (!matrix || matrix.length === 0) return [];

  let pr = -1, pc = -1;
  for (let r = 0; r < matrix.length; r++)
    for (let c = 0; c < (matrix[r]?.length ?? 0); c++)
      if (matrix[r][c] === playerValue) { pr = r; pc = c; }

  if (pr === -1) return [];

  const size = MATRIX_SIZE;
  const moves: Array<[number, number]> = [];
  const directions: Array<[number, number]> = [[-2, 0], [2, 0], [0, -2], [0, 2]];

  function isOpponent(val: CellValue): boolean {
    return val >= 1 && val <= 4 && val !== playerValue;
  }

  for (const [dr, dc] of directions) {
    const wallR = pr + dr / 2;
    const wallC = pc + dc / 2;
    const targetR = pr + dr;
    const targetC = pc + dc;

    if (targetR < 0 || targetR >= size || targetC < 0 || targetC >= size) continue;
    if (matrix[wallR]?.[wallC] === WALL_VALUE) continue;

    const targetVal = matrix[targetR]?.[targetC] ?? 0;

    if (targetVal === 0) {
      moves.push([targetR, targetC]);
    } else if (isOpponent(targetVal)) {
      const jumpR = targetR + dr;
      const jumpC = targetC + dc;
      const jumpWallR = targetR + dr / 2;
      const jumpWallC = targetC + dc / 2;

      const outOfBounds = jumpR < 0 || jumpR >= size || jumpC < 0 || jumpC >= size;
      const wallBehind = matrix[jumpWallR]?.[jumpWallC] === WALL_VALUE;

      if (!outOfBounds && !wallBehind && matrix[jumpR]?.[jumpC] === 0) {
        moves.push([jumpR, jumpC]);
      } else {
        for (const [dr2, dc2] of directions) {
          if (dr2 === dr && dc2 === dc) continue;
          if (dr2 === -dr && dc2 === -dc) continue;

          const altWallR = targetR + dr2 / 2;
          const altWallC = targetC + dc2 / 2;
          const altJumpR = targetR + dr2;
          const altJumpC = targetC + dc2;

          if (altJumpR < 0 || altJumpR >= size) continue;
          if (altJumpC < 0 || altJumpC >= size) continue;
          if (matrix[altWallR]?.[altWallC] === WALL_VALUE) continue;
          if (matrix[altJumpR]?.[altJumpC] !== 0) continue;

          moves.push([altJumpR, altJumpC]);
        }
      }
    }
  }

  return moves;
}