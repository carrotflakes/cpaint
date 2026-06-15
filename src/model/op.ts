import { Effect } from "@/features/effects";
import { Rect as TransformRect, makeApply } from "../components/overlays/TransformRectHandles";
import { applyPatches } from "../libs/applyPatches";
import { bucketFill } from "../libs/bucket";
import { canvasToImageDiff } from "../libs/imageDiff";
import { MCanvas } from "../libs/MCanvas";
import { Patch } from "../libs/patch";
import { Selection } from "../libs/Selection";
import { startTouchBrush } from "../libs/touch/brush";
import cc from "color-convert";
import type { State } from "./state";
import { getLayerById, StateReplaceLayerCanvas } from "./state";
import { StateDiff } from "./stateContainer";
import { createFill } from "@/libs/createFill";

export type Op = {
  type: "stroke";
  erase: boolean;
  alphaLock: boolean;
  strokeStyle: {
    color: string
    brushType: string
    width: number
  };
  opacity: number;
  path: { pos: [number, number], pressure: number }[];
  layerId: string;
} | {
  type: "fill";
  fillColor: string;
  opacity: number;
  erase: boolean;
  path: [number, number][];
  layerId: string;
} | {
  type: "bucketFill";
  fillColor: string;
  opacity: number;
  erase: boolean;
  tolerance: number;
  pos: [number, number];
  layerId: string;
} | {
  type: "layerTransform";
  layerId: string;
  rect: TransformRect;
} | {
  type: "selectionFill";
  fillColor: string;
  opacity: number;
  layerId: string;
} | {
  type: "selectionDelete";
  layerId: string;
} | {
  type: "applyEffect";
  effect: Effect;
  layerId: string;
} | {
  type: "patch";
  name: string;
  patches: Patch[];
};

function clampRectToCanvas(
  rect: { x: number; y: number; width: number; height: number },
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  const x = Math.max(0, Math.min(width, Math.floor(rect.x)));
  const y = Math.max(0, Math.min(height, Math.floor(rect.y)));
  const right = Math.max(0, Math.min(width, Math.ceil(rect.x + rect.width)));
  const bottom = Math.max(0, Math.min(height, Math.ceil(rect.y + rect.height)));
  return { x, y, width: right - x, height: bottom - y };
}

// Apply an edit to a copy of the layer's canvas and return the new state plus
// the image diff. Returns null when the target is missing/not a layer or when
// nothing changed.
//
// When `clip` is given, the diff is only scanned within that region (clamped
// to the canvas). The caller must guarantee the edit cannot change pixels
// outside it; the renderer already trusts these rects for partial redraws, so
// reusing them keeps diff cost proportional to the edited area rather than the
// whole canvas.
export function editLayerCanvas(
  state: State,
  layerId: string,
  edit: (ctx: OffscreenCanvasRenderingContext2D) => void,
  clip?: { x: number; y: number; width: number; height: number },
): { state: State; diff: StateDiff } | null {
  const layer = getLayerById(state.layers, layerId);
  if (layer.type !== "layer") return null;

  const newCanvas = new MCanvas(layer.canvas.width, layer.canvas.height);
  const ctx = newCanvas.getContextWrite();
  ctx.drawImage(layer.canvas.getCanvas(), 0, 0);
  edit(ctx);

  let scanClip = clip;
  if (clip) {
    scanClip = clampRectToCanvas(clip, newCanvas.width, newCanvas.height);
    // Fully off-canvas: nothing could have changed.
    if (scanClip.width <= 0 || scanClip.height <= 0) return null;
  }

  const imageDiff = canvasToImageDiff(newCanvas, layer.canvas, scanClip);
  if (imageDiff == null) return null;

  return {
    state: StateReplaceLayerCanvas(state, layerId, newCanvas),
    diff: { type: "imageDiffs", layers: [{ id: layer.id, imageDiff }] },
  };
}

export function applyOp(
  state: State,
  op: Op,
): {
  state: State;
  diff: StateDiff;
} | null {
  if (op.type === "stroke") {
    const layer = getLayerById(state.layers, op.layerId);
    if (layer.type !== "layer") return null;
    const touch = startTouchBrush({
      brushType: op.strokeStyle.brushType,
      width: op.strokeStyle.width,
      color: op.strokeStyle.color,
      opacity: op.opacity,
      erase: op.erase,
      alphaLock: op.alphaLock,
      canvasSize: [layer.canvas.width, layer.canvas.height],
    });
    for (const p of op.path) {
      touch.stroke(p.pos[0], p.pos[1], p.pressure);
    }
    touch.end();
    return editLayerCanvas(state, op.layerId, (ctx) => touch.transfer(ctx), touch.rect ?? undefined);
  }
  if (op.type === "fill") {
    return editLayerCanvas(state, op.layerId, (ctx) => {
      createFill(op.path, op.fillColor, op.opacity, op.erase)(ctx);
    });
  }
  if (op.type === "bucketFill") {
    const layer = getLayerById(state.layers, op.layerId);
    if (layer.type !== "layer") return null;
    
    const newCanvas = new MCanvas(
      layer.canvas.width,
      layer.canvas.height,
    );
    const ctx = newCanvas.getContextWrite();
    ctx.drawImage(layer.canvas.getCanvas(), 0, 0);
    
    const ctxRead = layer.canvas.getContextRead();
    const imageDataSrc = ctxRead.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const imageDataDst = new ImageData(layer.canvas.width, layer.canvas.height);
    
    const rgb = cc.hex.rgb(op.fillColor.slice(1));
    const rgba = {
      r: rgb[0],
      g: rgb[1],
      b: rgb[2],
      a: 255,
    };
    
    bucketFill(imageDataSrc, imageDataDst, op.pos[0], op.pos[1], rgba, op.tolerance);
    
    ctx.save();
    if (op.erase) {
      ctx.globalCompositeOperation = "destination-out";
    }
    ctx.globalAlpha = op.opacity;
    ctx.putImageData(imageDataDst, 0, 0);
    ctx.restore();
    
    const id = canvasToImageDiff(newCanvas, layer.canvas);
    if (id == null) return null;
    
    const diff: StateDiff = {
      type: "imageDiffs",
      layers: [{
        id: layer.id,
        imageDiff: id,
      }],
    };
    const newState = StateReplaceLayerCanvas(state, layer.id, newCanvas);
    return { state: newState, diff };
  }
  if (op.type === "selectionFill") {
    const selection = state.selection;
    if (!selection) return null;
    return editLayerCanvas(state, op.layerId, (ctx) => {
      ctx.save();
      selection.setCanvasClip(ctx);
      ctx.fillStyle = op.fillColor;
      ctx.globalAlpha = op.opacity;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }, selection.getBounds() ?? undefined);
  }
  if (op.type === "selectionDelete") {
    const selection = state.selection;
    if (!selection) return null;
    return editLayerCanvas(state, op.layerId, (ctx) => {
      ctx.save();
      selection.setCanvasClip(ctx);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }, selection.getBounds() ?? undefined);
  }
  if (op.type === "layerTransform") {
    const layer = getLayerById(state.layers, op.layerId);
    if (layer.type !== "layer") return null;
    
    const canvas = layer.canvas;
    let selection = state.selection;
    
    // If no selection, use canvas bounding box
    if (!selection) {
      const bbox = canvas.getBbox();
      if (!bbox) return null;
      selection = new Selection(canvas.width, canvas.height);
      selection.addRect(bbox.x, bbox.y, bbox.width, bbox.height, "new");
    }
    
    const bbox = selection.getBounds();
    if (!bbox) return null;
    
    // Split canvas by selection
    const ctxRead = canvas.getContextRead();
    const baseID = ctxRead.getImageData(0, 0, canvas.width, canvas.height);
    const targetID = ctxRead.getImageData(0, 0, canvas.width, canvas.height);
    
    selection.clipImageData(targetID);
    const targetCanvas = new MCanvas(bbox.width, bbox.height);
    targetCanvas.getContextWrite().putImageData(targetID, -bbox.x, -bbox.y);
    
    const selectionInverted = selection.clone();
    selectionInverted.invert();
    selectionInverted.clipImageData(baseID);
    const baseCanvas = new MCanvas(canvas.width, canvas.height);
    baseCanvas.getContextWrite().putImageData(baseID, 0, 0);
    
    // Apply transformation
    const newCanvas = new MCanvas(canvas.width, canvas.height);
    const ctx = newCanvas.getContextWrite();
    const apply = makeApply(baseCanvas, targetCanvas, op.rect);
    apply(ctx);
    
    const id = canvasToImageDiff(newCanvas, layer.canvas);
    if (id == null) return null;
    
    const diff: StateDiff = {
      type: "imageDiffs",
      layers: [{
        id: layer.id,
        imageDiff: id,
      }],
    };
    const newState = StateReplaceLayerCanvas(state, layer.id, newCanvas);
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
  if (op1.type === "patch" && op2.type === "patch" && op1.name === op2.name) {
    const patches = shrinkPatches([...op1.patches, ...op2.patches]);
    if (patches)
      return {
        type: "patch",
        name: op1.name,
        patches,
      };
  }
  return null;
}

export function shrinkPatches(patches: Patch[]): Patch[] | null {
  patches = patches.slice();
  let shrinked = false;
  iterate: while (true) {
    for (let i = 0; i < patches.length; i++) {
      const current = patches[i];
      const next = patches[i + 1];
      if (next && current.op === "replace" && next.op === "replace" &&
        JSON.stringify(current.path) === JSON.stringify(next.path)) {
        patches.splice(i, 1);
        shrinked = true;
        continue iterate;
      }
    }
    break;
  }
  return shrinked ? patches : null;
}
