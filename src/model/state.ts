import { applyPatches } from "../libs/applyPatches";
import { applyImageDiff, canvasToImageDiff, ImageDiff } from "../libs/imageDiff";
import { MCanvas } from "../libs/MCanvas";
import { Patch } from "../libs/patch";
import { Selection } from "../libs/Selection";
import { BlendMode } from "./blendMode";
import { applyOp, mergeOp, shrinkPatches, type Op } from "./op";
import { OpTs, OpTsNew } from "./opts";

export type State = Readonly<{
  layers: readonly {
    id: string;
    canvas: MCanvas;
    visible: boolean;
    opacity: number;
    blendMode: BlendMode;
    locked: boolean;
  }[];
  selection: Selection | null;
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

export const DEFAULT_LAYER_PROPS = {
  visible: true,
  opacity: 1,
  blendMode: "source-over" as BlendMode,
  locked: false,
}

export function StateNew(
  width: number,
  height: number,
  addWhiteBackground: boolean,
): State {
  const layers = [
    {
      ...DEFAULT_LAYER_PROPS,
      id: newLayerId(),
      canvas: new MCanvas(width, height),
    },
  ];

  if (addWhiteBackground) {
    const canvas = new MCanvas(width, height);
    const ctx = canvas.getContextWrite();
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    layers.unshift({
      ...DEFAULT_LAYER_PROPS,
      id: "bg",
      canvas,
    });
  }

  return {
    layers,
    selection: null,
  };
}

export function StateFromImage(image: HTMLImageElement) {
  const { width, height } = image;
  const canvas = new MCanvas(width, height);
  const ctx = canvas.getContextWrite();
  ctx.drawImage(image, 0, 0);
  return {
    layers: [
      {
        ...DEFAULT_LAYER_PROPS,
        id: newLayerId(),
        canvas,
      },
    ],
    selection: null,
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
  layerMod: LayerMod | null,
): StateContainer {
  const opts = OpTsNew(op);
  if ((op.type === "stroke" || op.type === "fill" || op.type === "bucketFill" || op.type === "layerTransform" || op.type === "selectionFill" || op.type === "selectionDelete") && layerMod) {
    const layer = sc.state.layers.find(l => l.id === layerMod.layerId);
    if (!layer) {
      throw new Error(`Layer ${layerMod.layerId} not found`);
    }
    const canvas = new MCanvas(
      layer.canvas.width,
      layer.canvas.height,
    );
    const ctx = canvas.getContextWrite();
    if (!ctx) {
      throw new Error("Failed to get context");
    }
    ctx.drawImage(layer.canvas.getCanvas(), 0, 0);
    ctx.save();
    layerMod.apply(ctx);
    ctx.restore();
    const diff = canvasToImageDiff(canvas, layer.canvas);
    if (!diff) {
      // No difference found
      return sc;
    }
    const state = {
      layers: [...sc.state.layers],
      selection: sc.state.selection,
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
  layers: State["layers"],
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  layerMod: LayerMod | null,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (!layer.visible) continue; // Skip rendering invisible layers

    if (layer.id === layerMod?.layerId) {
      const canvas = getTmpCanvas(layer.canvas.width, layer.canvas.height);
      const layerCtx = canvas.getContext("2d", { willReadFrequently: true });
      if (!layerCtx) {
        throw new Error("Failed to get context");
      }
      layerCtx.clearRect(0, 0, canvas.width, canvas.height);
      layerCtx.drawImage(layer.canvas.getCanvas(), 0, 0);
      layerCtx.save();
      layerMod.apply(layerCtx);
      layerCtx.restore();

      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(canvas, 0, 0);
    } else {
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(layer.canvas.getCanvas(), 0, 0);
    }
  }
  ctx.restore();
}

let tmpCanvas = new OffscreenCanvas(1, 1);

function getTmpCanvas(width: number, height: number) {
  if (tmpCanvas.width !== width || tmpCanvas.height !== height) {
    tmpCanvas = new OffscreenCanvas(width, height);
  }
  return tmpCanvas;
}

export type LayerMod = {
  layerId: string;
  apply: (ctx: OffscreenCanvasRenderingContext2D) => void;
}

export function newLayerId() {
  return `${Date.now() % 1000000}`;
}
