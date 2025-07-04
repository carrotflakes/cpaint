import { MCanvas } from "@/libs/MCanvas";
import { Selection } from "@/libs/Selection";
import { BlendMode } from "./blendMode";

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
  size: {
    width: number;
    height: number;
  };
  nextLayerId: number;
}>

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
  let layerId = 1;
  const layers = [
    {
      ...DEFAULT_LAYER_PROPS,
      id: newLayerId(layerId++),
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
    size: {
      width,
      height,
    },
    nextLayerId: layerId,
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
        id: newLayerId(1),
        canvas,
      },
    ],
    selection: null,
    size: {
      width,
      height,
    },
    nextLayerId: 2,
  };
}

// Render the state to the canvas
export function StateRender(
  state: State,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  layerMod: LayerMod | null,
) {
  ctx.clearRect(0, 0, state.size.width, state.size.height);

  ctx.save();
  for (let i = 0; i < state.layers.length; i++) {
    const layer = state.layers[i];
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

export function newLayerId(state: State | number): string {
  return `layer-${typeof state === "number" ? state : state.nextLayerId}`;
}

export function computeNextLayerIdFromLayerIds(layerIds: string[]): number {
  let maxId = 0;
  for (const id of layerIds) {
    const match = id.match(/layer-(\d+)/);
    if (match)
      maxId = Math.max(maxId, parseInt(match[1], 10));
  }
  return maxId + 1;
}

// Helper functions for layer ID-based operations
export function findLayerById(layers: State["layers"], layerId: string): State["layers"][number] | undefined {
  return layers.find(layer => layer.id === layerId);
}

export function findLayerIndexById(layers: State["layers"], layerId: string): number {
  return layers.findIndex(layer => layer.id === layerId);
}

export function getLayerById(layers: State["layers"], layerId: string): State["layers"][number] {
  const layer = findLayerById(layers, layerId);
  if (!layer) {
    throw new Error(`Layer with id ${layerId} not found`);
  }
  return layer;
}
