export interface CheckQuestion {
  expression: string;
  answer: number;
  label: string;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateCheckQuestion(): CheckQuestion {
  const a = rand(2, 12);
  const b = rand(1, 9);
  const plus = Math.random() < 0.5;
  let left = a;
  let right = b;
  if (!plus && right > left) {
    const t = left;
    left = right;
    right = t;
  }
  const answer = plus ? left + right : left - right;
  return {
    expression: `${left}${plus ? '+' : '-'}${right}`,
    answer,
    label: `${left} ${plus ? 'mais' : 'menos'} ${right}`,
  };
}