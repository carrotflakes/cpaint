import { describe, it, expect } from 'vitest';
import { applyPatch, Patch } from './patch';

describe('applyPatch', () => {
  it('should add a value to an object', () => {
    const obj = { a: 1 };
    const patch: Patch = { op: 'add', path: '/b', value: 2 };
    const result = applyPatch(obj, patch);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should remove a value from an object', () => {
    const obj = { a: 1, b: 2 };
    const patch: Patch = { op: 'remove', path: '/b' };
    const result = applyPatch(obj, patch);
    expect(result).toEqual({ a: 1 });
  });

  it('should replace a value in an object', () => {
    const obj = { a: 1, b: 2 };
    const patch: Patch = { op: 'replace', path: '/b', value: 3 };
    const result = applyPatch(obj, patch);
    expect(result).toEqual({ a: 1, b: 3 });
  });

  it('should move a value within an object', () => {
    const obj = { a: 1, b: 2 };
    const patch: Patch = { op: 'move', from: '/b', to: '/c' };
    const result = applyPatch(obj, patch);
    expect(result).toEqual({ a: 1, c: 2 });
  });

  it('should move a value within an array', () => {
    const obj = { a: [1, 2, 3, 4] };
    const patch: Patch = { op: 'move', from: '/a/2', to: '/a/0' };
    const result = applyPatch(obj, patch);
    expect(result).toEqual({ a: [3, 1, 2, 4] });
  });

  it('should move a value within an array', () => {
    const obj = { a: [1, 2, 3, 4] };
    const patch: Patch = { op: 'move', from: '/a/0', to: '/a/2' };
    const result = applyPatch(obj, patch);
    expect(result).toEqual({ a: [2, 1, 3, 4] });
  });

  it('should throw an error for an invalid path', () => {
    const obj = { a: 1 };
    const patch: Patch = { op: 'add', path: 'invalid', value: 2 };
    expect(() => applyPatch(obj, patch)).toThrowError('Invalid path');
  });
});
