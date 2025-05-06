import { applyPatch, Obj, Patch, reversePatch } from "./patch";

export function applyPatches(
  obj: Obj,
  patches: Patch[],
): {
  obj: Obj;
  revPatches: Patch[];
} {
  const revPatches: Patch[] = [];
  for (const patch of patches) {
    const revPatch = reversePatch(obj, patch);
    obj = applyPatch(obj, patch);
    revPatches.push(revPatch);
  }
  return {
    obj,
    revPatches: revPatches.reverse(),
  };
}
