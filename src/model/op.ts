import { produce } from "immer";
import { applyPatches } from "../libs/applyPatches";
import { startTouchFill, startTouchHard, startTouchSoft } from "../libs/brash";
import { canvasToImageDiff } from "../libs/canvasUtil";
import { Patch } from "../libs/patch";
import type { State, StateDiff } from "./state";

export type Op = {
  type: "stroke";
  erase: boolean;
  strokeStyle: {
    color: string
    soft: boolean
    width: number
  };
  opacity: number;
  path: { pos: [number, number], pressure: number }[];
  layerIndex: number;
} | {
  type: "fill";
  fillColor: string;
  opacity: number;
  path: { pos: [number, number] }[];
  layerIndex: number;
} | {
  type: "patch";
  patches: Patch[];
};

export function applyOp(
  state: State,
  op: Op,
): {
  state: State;
  diff: StateDiff;
} | null {
  if (op.type === "stroke" || op.type === "fill") {
    const layer = state.layers[op.layerIndex];
    const touch = op.type === "stroke" ?
      (op.strokeStyle.soft ? startTouchSoft({
        width: op.strokeStyle.width,
        color: op.strokeStyle.color,
        opacity: op.opacity,
        erace: op.erase,
        canvasSize: [layer.canvas.width, layer.canvas.height],
      }) : startTouchHard({
        width: op.strokeStyle.width,
        color: op.strokeStyle.color,
        opacity: op.opacity,
        erace: op.erase,
        canvasSize: [layer.canvas.width, layer.canvas.height],
      })) :
      startTouchFill({
        color: op.fillColor,
        opacity: op.opacity,
      });
    const newCanvas = new OffscreenCanvas(
      layer.canvas.width,
      layer.canvas.height,
    );
    const ctx = newCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get context");
    }
    ctx.drawImage(layer.canvas, 0, 0);

    if (op.type === "stroke") {
      for (const p of op.path) {
        touch.stroke(p.pos[0], p.pos[1], p.pressure);
      }
    } else if (op.type === "fill") {
      for (const p of op.path) {
        touch.stroke(p.pos[0], p.pos[1], 1);
      }
    }

    touch.end();
    touch.transfer(ctx);

    const id = canvasToImageDiff(
      newCanvas,
      layer.canvas);

    if (id == null)
      return null;
    const diff: StateDiff = {
      type: "imageDiffs",
      layers: [{
        id: layer.id,
        imageDiff: id,
      }],
    };
    const newState = produce(state, (draft) => {
      draft.layers[op.layerIndex] = {
        ...draft.layers[op.layerIndex],
        canvas: newCanvas,
      };
    });
    return { state: newState, diff };
  }
  if (op.type === "patch") {
    const aps = applyPatches(state, op.patches);
    return { state: aps.obj as State, diff: { type: "patch", patches: aps.revPatches } };
  }
  return null;
}

// Merge two operations into one
// Returns null if the operations cannot be merged
export function mergeOp(
  op1: Op,
  op2: Op,
): Op | null {
  if (op1.type === "patch" && op2.type === "patch") {
    const patches = shrinkPatches([...op1.patches, ...op2.patches]);
    if (patches)
      return {
        type: "patch",
        patches,
      };
  }
  return null;
}

export function shrinkPatches(patches: Patch[]): Patch[] | null {
  patches = patches.slice();
  let shrinked = false;
  iterate: do {
    for (let i = 0; i < patches.length; i++) {
      const current = patches[i];
      const next = patches[i + 1];
      if (next && current.op === "replace" && next.op === "replace" && current.path === next.path) {
        patches.splice(i, 1);
        shrinked = true;
        continue iterate;
      }
    }
  } while (false);
  return shrinked ? patches : null;
}
