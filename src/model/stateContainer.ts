import { applyPatches } from "@/libs/applyPatches";
import { applyImageDiff, ImageDiff } from "@/libs/imageDiff";
import { Patch } from "@/libs/patch";
import { applyOp, editLayerCanvas, mergeOp, shrinkPatches, type Op } from "./op";
import { OpTs, OpTsNew } from "./opts";
import { getLayerById, State } from "./state";
import { LayerMod, StateRenderer } from "./StateRenderer";

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

// This function applies the diff to the state and returns the new state and the reverse diff
// ⚠ We cannot reuse the state because it is modified!
export function applyStateDiff(
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
      const layer = getLayerById(newState.layers, layerDiff.id);
      if (layer.type !== "layer") {
        throw new Error(`Layer with id ${layerDiff.id} not found or is not a layer`);
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

export type StateContainer = Readonly<{
  state: State;
  backward: readonly { op: OpTs; diff: StateDiff }[];
  forward: readonly { op: OpTs; diff: StateDiff }[];
  renderer: StateRenderer;
}>;

export function StateContainerFromState(
  state: State,
): StateContainer {
  return {
    state,
    backward: [],
    forward: [],
    renderer: new StateRenderer(state.size.width, state.size.height),
  };
}

export function StateContainerDo(
  sc: StateContainer,
  op: Op,
  layerMod: LayerMod | null,
): StateContainer {
  const opts = OpTsNew(op);

  if (op.type === "applyEffect" && !layerMod)
    throw new Error("LayerMod is required for applyEffect operation");

  if ((op.type === "stroke" || op.type === "fill" || op.type === "bucketFill" || op.type === "layerTransform" || op.type === "selectionFill" || op.type === "selectionDelete" || op.type === "applyEffect") && layerMod) {
    const layer = getLayerById(sc.state.layers, layerMod.layerId);
    if (layer.type !== "layer") {
      throw new Error(`Layer with id ${layerMod.layerId} not found or is not a layer`);
    }
    // The renderer already trusts layerMod.rect to bound the change, so reuse
    // it to limit the diff scan instead of comparing the whole canvas.
    const clip = typeof layerMod.rect === "object" ? layerMod.rect : undefined;
    const result = editLayerCanvas(sc.state, layerMod.layerId, (ctx) => {
      ctx.save();
      layerMod.apply(ctx);
      ctx.restore();
    }, clip);
    if (!result) {
      // No difference found
      return sc;
    }
    return {
      state: result.state,
      backward: newBackward(sc.backward, { op: opts, diff: result.diff }),
      forward: [],
      renderer: sc.renderer,
    }
  } else {
    const ao = applyOp(sc.state, op);
    if (!ao)
      return sc;
    return {
      state: ao.state,
      backward: newBackward(sc.backward, { op: opts, diff: ao.diff }),
      forward: [],
      renderer: sc.renderer,
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
    renderer: sc.renderer,
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
    renderer: sc.renderer,
  };
}

export function StateContainerHasUndo(sc: StateContainer): boolean {
  return sc.backward.length > 0;
}
export function StateContainerHasRedo(sc: StateContainer): boolean {
  return sc.forward.length > 0;
}

export function StateContainerRender(
  sc: StateContainer,
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  layerMod: LayerMod | null = null,
): void {
  sc.renderer.render(sc.state, ctx, layerMod);
}
