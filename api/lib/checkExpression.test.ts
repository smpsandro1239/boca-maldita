import { describe, expect, it } from 'vitest';
import { solveCheckExpression } from './checkExpression';

describe('solveCheckExpression', () => {
  it('resolves simple additions', () => {
    expect(solveCheckExpression('5 + 3')).toBe(8);
    expect(solveCheckExpression('100 + 200')).toBe(300);
    expect(solveCheckExpression('0 + 999')).toBe(999);
  });

  it('resolves simple subtractions', () => {
    expect(solveCheckExpression('9 - 4')).toBe(5);
    expect(solveCheckExpression('200 - 50')).toBe(150);
  });

  it('accepts surrounding whitespace', () => {
    expect(solveCheckExpression('  7 + 2  ')).toBe(9);
  });

  it('rejects malformed expressions', () => {
    expect(solveCheckExpression('')).toBeNull();
    expect(solveCheckExpression('cinco mais dois')).toBeNull();
    expect(solveCheckExpression('5*3')).toBeNull();
    expect(solveCheckExpression('3 +')).toBeNull();
    expect(solveCheckExpression('5 + 3 + 1')).toBeNull();
    expect(solveCheckExpression('1000 + 1')).toBeNull();
  });

  it('rejects non-numeric operands', () => {
    expect(solveCheckExpression('a + b')).toBeNull();
    expect(solveCheckExpression('5 + x')).toBeNull();
  });
});