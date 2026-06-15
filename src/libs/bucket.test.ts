import { describe, it, expect } from 'vitest';
import { bucketFill } from './bucket';

type RGBA = [number, number, number, number];

// The vitest environment is node, which has no `ImageData` global. bucketFill
// only reads `width`, `height`, and `data`, so a plain object is enough.
function makeImageData(width: number, height: number, fill: RGBA = [0, 0, 0, 0]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return { width, height, data } as unknown as ImageData;
}

function setPx(img: ImageData, x: number, y: number, c: RGBA) {
  const i = (y * img.width + x) * 4;
  img.data[i] = c[0];
  img.data[i + 1] = c[1];
  img.data[i + 2] = c[2];
  img.data[i + 3] = c[3];
}

function getPx(img: ImageData, x: number, y: number): RGBA {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}

function alphaAt(img: ImageData, x: number, y: number) {
  return img.data[(y * img.width + x) * 4 + 3];
}

const FILL = { r: 255, g: 0, b: 0, a: 255 };
const RED: RGBA = [255, 0, 0, 255];

describe('bucketFill', () => {
  it('fills an entire uniform canvas', () => {
    const src = makeImageData(8, 6); // fully transparent
    const dst = makeImageData(8, 6);
    bucketFill(src, dst, 0, 0, FILL);
    for (let y = 0; y < 6; y++)
      for (let x = 0; x < 8; x++)
        expect(alphaAt(dst, x, y)).toBe(255);
  });

  it('does nothing when the start pixel already has the fill color', () => {
    const src = makeImageData(4, 4, RED);
    const dst = makeImageData(4, 4);
    bucketFill(src, dst, 1, 1, FILL);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++)
        expect(alphaAt(dst, x, y)).toBe(0);
  });

  it('does nothing when the start point is out of bounds', () => {
    const src = makeImageData(4, 4);
    const dst = makeImageData(4, 4);
    bucketFill(src, dst, -1, 0, FILL);
    bucketFill(src, dst, 4, 0, FILL);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++)
        expect(alphaAt(dst, x, y)).toBe(0);
  });

  it('does not leak across an opaque barrier', () => {
    const w = 5, h = 4;
    const src = makeImageData(w, h);
    for (let y = 0; y < h; y++) setPx(src, 2, y, [0, 0, 0, 255]); // vertical wall
    const dst = makeImageData(w, h);
    bucketFill(src, dst, 0, 0, FILL);
    for (let y = 0; y < h; y++) {
      expect(alphaAt(dst, 0, y)).toBe(255);
      expect(alphaAt(dst, 1, y)).toBe(255);
      expect(alphaAt(dst, 2, y)).toBe(0); // wall
      expect(alphaAt(dst, 3, y)).toBe(0); // right region unreachable
      expect(alphaAt(dst, 4, y)).toBe(0);
    }
  });

  it('reaches spans that leak past the seed span (around a partial barrier)', () => {
    // Row 1 has a barrier at column 2 splitting it into [0,1] and [3,4].
    // The right part is reachable only via rows 0/2, which requires the popped
    // seed to re-expand beyond the originating span.
    const w = 5, h = 3;
    const src = makeImageData(w, h);
    setPx(src, 2, 1, [0, 0, 0, 255]); // barrier
    const dst = makeImageData(w, h);
    bucketFill(src, dst, 0, 1, FILL);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        expect(alphaAt(dst, x, y)).toBe(x === 2 && y === 1 ? 0 : 255);
  });

  it('respects tolerance', () => {
    const src = makeImageData(3, 1);
    setPx(src, 0, 0, [100, 100, 100, 255]);
    setPx(src, 1, 0, [110, 110, 110, 255]); // close to pixel 0
    setPx(src, 2, 0, [255, 255, 255, 255]); // far from pixel 0

    const exact = makeImageData(3, 1);
    bucketFill(src, exact, 0, 0, FILL, 0);
    expect(alphaAt(exact, 0, 0)).toBe(255);
    expect(alphaAt(exact, 1, 0)).toBe(0);
    expect(alphaAt(exact, 2, 0)).toBe(0);

    const loose = makeImageData(3, 1);
    bucketFill(src, loose, 0, 0, FILL, 0.1);
    expect(alphaAt(loose, 0, 0)).toBe(255);
    expect(alphaAt(loose, 1, 0)).toBe(255);
    expect(alphaAt(loose, 2, 0)).toBe(0);
  });

  it('matches a reference flood fill on pseudo-random inputs', () => {
    const rng = makeRng(12345);
    const palette: RGBA[] = [
      [0, 0, 0, 0],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [128, 64, 200, 255],
    ];
    for (let iter = 0; iter < 30; iter++) {
      const w = 3 + Math.floor(rng() * 14);
      const h = 3 + Math.floor(rng() * 14);
      const src = makeImageData(w, h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          setPx(src, x, y, palette[Math.floor(rng() * palette.length)]);

      const sx = Math.floor(rng() * w);
      const sy = Math.floor(rng() * h);
      const tolerance = rng() < 0.5 ? 0 : rng() * 0.4;

      const actual = makeImageData(w, h);
      bucketFill(src, actual, sx, sy, FILL, tolerance);
      const expected = referenceFill(src, sx, sy, FILL, tolerance);

      expect(Array.from(actual.data)).toEqual(Array.from(expected.data));
    }
  });
});

// --- reference implementation (obviously-correct 4-connected BFS) ---

function colorsMatch(a: RGBA, b: RGBA): boolean {
  return (a[3] === 0 && b[3] === 0) ||
    (a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]);
}

function colorsDistance(a: RGBA, b: RGBA): number {
  return Math.sqrt(
    (((a[0] - b[0]) / 255) ** 2 +
      ((a[1] - b[1]) / 255) ** 2 +
      ((a[2] - b[2]) / 255) ** 2) / 3
  ) * (a[3] + b[3]) / (2 * 255);
}

function referenceFill(
  src: ImageData,
  sx: number,
  sy: number,
  fill: { r: number; g: number; b: number; a: number },
  tolerance: number,
): ImageData {
  const w = src.width, h = src.height;
  const dst = makeImageData(w, h);
  const fillRGBA: RGBA = [fill.r, fill.g, fill.b, fill.a];
  const target = getPx(src, sx, sy);
  if (colorsMatch(target, fillRGBA)) return dst;
  const match = (c: RGBA) =>
    tolerance > 0 ? colorsDistance(c, target) <= tolerance : colorsMatch(c, target);

  const visited = new Uint8Array(w * h);
  const stack: [number, number][] = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    if (visited[y * w + x]) continue;
    if (!match(getPx(src, x, y))) continue;
    visited[y * w + x] = 1;
    setPx(dst, x, y, fillRGBA);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return dst;
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
