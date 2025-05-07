import { applyPatches } from "../libs/applyPatches";
import { applyImageDiff, canvasToImageDiff, ImageDiff } from "../libs/canvasUtil";
import { Patch } from "../libs/patch";
import { BlendMode } from "./blendMode";
import { applyOp, mergeOp, shrinkPatches, type Op } from "./op";
import { OpTs, OpTsNew } from "./opts";

export type State = Readonly<{
  layers: readonly {
    id: string;
    canvas: OffscreenCanvas;
    visible: boolean;
    opacity: number;
    blendMode: BlendMode;
  }[];
}>

export type StateContainer = Readonly<{
  state: State;
  backward: readonly { op: OpTs; diff: StateDiff }[];
  forward: readonly { op: OpTs; diff: StateDiff }[];
}>;

export type StateDiff = {
  type: "imageDiffs";
  layers: {
    id: string;
    imageDiff: ImageDiff;
  }[];
} | {
  type: "patch";
  patches: Patch[];
};

export function StateContainerNew(
  width: number,
  height: number,
) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get context");
  }
  // ctx.fillStyle = "white";
  // ctx.fillRect(0, 0, width, height);
  return {
    state: {
      layers: [
        {
          id: "0",
          canvas,
          visible: true,
          opacity: 1,
          blendMode: "source-over" as BlendMode,
        },
      ],
    },
    backward: [],
    forward: [],
  };
}

export function StateContainerFromState(
  state: State,
) {
  return {
    state,
    backward: [],
    forward: [],
  };
}

export function StateContainerDo(
  sc: StateContainer,
  op: Op,
  touch: Touch | null,
): StateContainer {
  const opts = OpTsNew(op);
  if ((op.type === "stroke" || op.type === "fill") && touch) {
    const layer = sc.state.layers.find(l => l.id === touch.layerId);
    if (!layer) {
      throw new Error(`Layer ${touch.layerId} not found`);
    }
    const canvas = new OffscreenCanvas(
      layer.canvas.width,
      layer.canvas.height,
    );
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get context");
    }
    ctx.drawImage(layer.canvas, 0, 0);
    touch.apply(ctx);
    const diff = canvasToImageDiff(canvas, layer.canvas);
    if (!diff) {
      // No difference found
      return sc;
    }
    const state = {
      layers: [...sc.state.layers],
    }
    state.layers[op.layerIndex] = {
      ...state.layers[op.layerIndex],
      canvas,
    }
    return {
      state,
      backward: newBackward(sc.backward, { op: opts, diff: { type: "imageDiffs", layers: [{ id: layer.id, imageDiff: diff }] } }),
      forward: [],
    }
  } else {
    const ao = applyOp(sc.state, op);
    if (!ao)
      return sc;
    return {
      state: ao.state,
      backward: newBackward(sc.backward, { op: opts, diff: ao.diff }),
      forward: [],
    };
  }
}

// Add onDiff to backward. If it is possible to merge, merge it.
function newBackward(
  backward: readonly { op: OpTs; diff: StateDiff }[],
  opDiff: { op: OpTs; diff: StateDiff },
): readonly { op: OpTs; diff: StateDiff }[] {
  const last = backward[backward.length - 1];
  if (!last)
    return [opDiff];

  const merged = mergeOpTs(last.op, opDiff.op);
  if (merged && last.diff.type === "patch" && opDiff.diff.type === "patch") {
    const patches = [...opDiff.diff.patches, ...last.diff.patches];
    const shrinked = shrinkPatches(patches) ?? patches;
    return [
      ...backward.slice(0, backward.length - 1),
      { op: merged, diff: { type: "patch", patches: shrinked } },
    ];
  }

  return [...backward, opDiff];
}

function mergeOpTs(
  op1: OpTs,
  op2: OpTs,
  graceTime: number = 1000,
): OpTs | null {
  if (op2.timestamp - op1.timestamp > graceTime)
    return null;

  const merged = mergeOp(op1, op2);
  return merged && {
    ...merged,
    timestamp: op2.timestamp,
  }
}

export function StateContainerRedo(
  sc: StateContainer,
): StateContainer {
  if (sc.forward.length === 0) return sc;
  const last = sc.forward[sc.forward.length - 1];
  const newForward = sc.forward.slice(0, sc.forward.length - 1);
  const asd = applyStateDiff(sc.state, last.diff);
  return {
    state: asd.state,
    backward: [...sc.backward, { op: last.op, diff: asd.diffRev }],
    forward: newForward,
  };
}

export function StateContainerUndo(
  sc: StateContainer,
): StateContainer {
  if (sc.backward.length === 0) return sc;
  const last = sc.backward[sc.backward.length - 1];
  const newBackward = sc.backward.slice(0, sc.backward.length - 1);
  const asd = applyStateDiff(sc.state, last.diff);
  return {
    state: asd.state,
    backward: newBackward,
    forward: [...sc.forward, { op: last.op, diff: asd.diffRev }],
  };
}

export function StateContainerHasUndo(sc: StateContainer): boolean {
  return sc.backward.length > 0;
}
export function StateContainerHasRedo(sc: StateContainer): boolean {
  return sc.forward.length > 0;
}

// This function applies the diff to the state and returns the new state and the reverse diff
// ⚠ We cannot reuse the state because it is modified!
function applyStateDiff(
  state: State,
  diff: StateDiff,
): {
  state: State;
  diffRev: StateDiff;
} {
  if (diff.type === "imageDiffs") {
    const newState = { ...state };
    const diffRev: StateDiff = {
      type: "imageDiffs",
      layers: [],
    };
    for (const layerDiff of diff.layers) {
      const layer = newState.layers.find(l => l.id === layerDiff.id);
      if (!layer) {
        continue;
      }
      const imageDiff = applyImageDiff(layer.canvas, layerDiff.imageDiff);
      diffRev.layers.push({
        id: layer.id,
        imageDiff,
      });
    }
    return {
      state: newState,
      diffRev,
    };
  } else if (diff.type === "patch") {
    const aps = applyPatches(state, diff.patches);
    return {
      state: aps.obj as State,
      diffRev: {
        type: "patch",
        patches: aps.revPatches,
      },
    };
  }
  throw new Error(`Unknown diff type: ${diff}`);
}

// Render the state to the canvas
export function StateRender(
  state: State,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  touch: Touch | null,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let i = 0; i < state.layers.length; i++) {
    const layer = state.layers[i];
    if (!layer.visible) continue; // Skip rendering invisible layers

    if (layer.id === touch?.layerId) {
      const canvas = getTmpCanvas(layer.canvas.width, layer.canvas.height);
      const layerCtx = canvas.getContext("2d");
      if (!layerCtx) {
        throw new Error("Failed to get context");
      }
      layerCtx.clearRect(0, 0, canvas.width, canvas.height);
      layerCtx.drawImage(layer.canvas, 0, 0);
      touch.apply(layerCtx);

      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(canvas, 0, 0);
    } else {
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(layer.canvas, 0, 0);
    }
  }
}

let tmpCanvas = new OffscreenCanvas(1, 1);

function getTmpCanvas(width: number, height: number) {
  if (tmpCanvas.width !== width || tmpCanvas.height !== height) {
    tmpCanvas = new OffscreenCanvas(width, height);
  }
  return tmpCanvas;
}

export type Touch = {
  layerId: string;
  apply: (ctx: OffscreenCanvasRenderingContext2D) => void;
}
