import { CellValue, MATRIX_SIZE } from "@/types/game";

export function getValidMoves(
  matrix: CellValue[][] | undefined | null,
  playerValue: CellValue
): Array<[number, number]> {
  if (!matrix || matrix.length === 0) return [];

  // find current pawn position
  let pr = -1, pc = -1;
  for (let r = 0; r < matrix.length; r++)
    for (let c = 0; c < (matrix[r]?.length ?? 0); c++)
      if (matrix[r][c] === playerValue) { pr = r; pc = c; }

  if (pr === -1) return [];

  const size = MATRIX_SIZE;
  const moves: Array<[number, number]> = [];

  const directions: Array<[number, number]> = [
    [-2, 0], // up
    [ 2, 0], // down
    [ 0,-2], // left
    [ 0, 2], // right
  ];

  for (const [dr, dc] of directions) {
  const wallR  = pr + dr / 2;
  const wallC  = pc + dc / 2;
  const targetR = pr + dr;
  const targetC = pc + dc;

  if (targetR < 0 || targetR >= size) continue;
  if (targetC < 0 || targetC >= size) continue;
  if (matrix[wallR]?.[wallC] === 3) continue;

  if (matrix[targetR]?.[targetC] === 0) {
    // normal move — cell is empty
    moves.push([targetR, targetC]);
  } else {
    // opponent is on target — try straight jump
    const jumpR     = targetR + dr;
    const jumpC     = targetC + dc;
    const jumpWallR = targetR + dr / 2;
    const jumpWallC = targetC + dc / 2;

    const outOfBounds = jumpR < 0 || jumpR >= size || jumpC < 0 || jumpC >= size;
    const wallBehind  = matrix[jumpWallR]?.[jumpWallC] === 3;

    if (!outOfBounds && !wallBehind && matrix[jumpR]?.[jumpC] === 0) {
      moves.push([jumpR, jumpC]);
    } else {
      // diagonal jump from opponent's position
      for (const [dr2, dc2] of directions) {
        if (dr2 === dr  && dc2 === dc)  continue;
        if (dr2 === -dr && dc2 === -dc) continue;
        const altWallR   = targetR + dr2 / 2;
        const altWallC   = targetC + dc2 / 2;
        const altJumpR   = targetR + dr2;
        const altJumpC   = targetC + dc2;
        if (altJumpR < 0 || altJumpR >= size) continue;
        if (altJumpC < 0 || altJumpC >= size) continue;
        if (matrix[altWallR]?.[altWallC] === 3) continue;
        if (matrix[altJumpR]?.[altJumpC] !== 0) continue;
        moves.push([altJumpR, altJumpC]);
      }
    }
  }
}

  return moves;
}