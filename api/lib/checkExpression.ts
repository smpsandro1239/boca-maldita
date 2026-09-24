export function solveCheckExpression(expression: string): number | null {
  const match = /^\s*(\d{1,3})\s*([+-])\s*(\d{1,3})\s*$/.exec(expression);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[3]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return match[2] === '+' ? a + b : a - b;
}