import { describe, it, expect } from 'vitest';
import { diffBounds } from './imageDiff';

function grid(width: number, height: number): Uint32Array {
  return new Uint32Array(width * height); // all zero
}

describe('diffBounds', () => {
  it('returns null when the buffers are identical', () => {
    expect(diffBounds(grid(4, 3), grid(4, 3), 4, 3)).toBeNull();
  });

  it('finds a single differing pixel (relative coordinates)', () => {
    const a = grid(4, 3);
    const b = grid(4, 3);
    b[1 * 4 + 2] = 0xffffffff; // (x=2, y=1)
    expect(diffBounds(a, b, 4, 3)).toEqual({ x: 2, y: 1, width: 1, height: 1 });
  });

  it('bounds multiple differing pixels', () => {
    const a = grid(5, 4);
    const b = grid(5, 4);
    b[0 * 5 + 1] = 1; // (1, 0)
    b[2 * 5 + 3] = 1; // (3, 2)
    expect(diffBounds(a, b, 5, 4)).toEqual({ x: 1, y: 0, width: 3, height: 3 });
  });

  it('handles differences at opposite corners', () => {
    const a = grid(4, 3);
    const b = grid(4, 3);
    b[0] = 1; // (0, 0)
    b[2 * 4 + 3] = 1; // (3, 2)
    expect(diffBounds(a, b, 4, 3)).toEqual({ x: 0, y: 0, width: 4, height: 3 });
  });
});
