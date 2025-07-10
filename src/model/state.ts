import { MCanvas } from "@/libs/MCanvas";
import { Selection } from "@/libs/Selection";
import { BlendMode } from "./blendMode";
import { produce } from "immer";

export type Layer = Readonly<{
  type: "layer";
  id: string;
  canvas: MCanvas;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
}>;

export type LayerGroup = Readonly<{
  type: "group";
  id: string;
  layers: readonly (Layer | LayerGroup)[];
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
}>;

export type State = Readonly<{
  layers: readonly (Layer | LayerGroup)[];
  selection: Selection | null;
  size: {
    width: number;
    height: number;
  };
  nextLayerId: number;
}>;

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
  const layers: Layer[] = [
    {
      ...DEFAULT_LAYER_PROPS,
      type: "layer",
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
      type: "layer",
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

export function StateFromImage(image: HTMLImageElement): State {
  const { width, height } = image;
  const canvas = new MCanvas(width, height);
  const ctx = canvas.getContextWrite();
  ctx.drawImage(image, 0, 0);
  return {
    layers: [
      {
        ...DEFAULT_LAYER_PROPS,
        type: "layer",
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

export function newLayerId(state: State | number): string {
  return `layer-${typeof state === "number" ? state : state.nextLayerId}`;
}

export function computeNextLayerIdFromLayers(layers: readonly (Layer | LayerGroup)[]): number {
  let maxId = 0;
  for (const layer of layers) {
    const match = layer.id.match(/layer-(\d+)/);
    if (match)
      maxId = Math.max(maxId, parseInt(match[1], 10) + 1);
    if (layer.type === "group") {
      const childMaxId = computeNextLayerIdFromLayers(layer.layers);
      maxId = Math.max(maxId, childMaxId);
    }
  }
  return maxId;
}

// Helper functions for layer ID-based operations
export function findLayerById(layers: State["layers"], layerId: string): State["layers"][number] | null {
  for (const layer of layers) {
    if (layer.id === layerId) {
      return layer;
    }
    if (layer.type === "group") {
      const found = findLayerById(layer.layers, layerId);
      if (found) return found;
    }
  }
  return null;
}

export function findLayerIndexById(layers: State["layers"], layerId: string): number[] | null {
  function findIndex(layers: State["layers"], layerId: string): number[] | null {
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (layer.id === layerId) {
        return [i];
      }
      if (layer.type === "group") {
        const foundIndex = findIndex(layer.layers, layerId);
        if (foundIndex) {
          foundIndex.unshift(i);
          return foundIndex;
        }
      }
    }
    return null;
  }
  return findIndex(layers, layerId);
}

export function StateReplaceLayerCanvas(
  state: State,
  layerId: string,
  newCanvas: MCanvas,
): State {
  return produce(state, draft => {
    function f(layers: typeof draft["layers"]) {
      for (const layer of layers) {
        if (layer.type === "layer") {
          if (layer.id === layerId)
            layer.canvas = newCanvas;
        } else if (layer.type === "group") {
          f(layer.layers);
        }
      }
    }
    f(draft.layers);
  });
}

export function getLayerById(layers: State["layers"], layerId: string): State["layers"][number] {
  const layer = findLayerById(layers, layerId);
  if (!layer) {
    throw new Error(`Layer with id ${layerId} not found`);
  }
  return layer;
}

export function getLayerByIndex(
  layers: State["layers"],
  index: number[],
): Layer {
  let currentLayers = layers;
  for (const i of index) {
    const layer = currentLayers[i];
    if (!layer) {
      throw new Error(`Layer at index ${i} not found`);
    }
    if (layer.type === "group") {
      currentLayers = layer.layers;
    } else if (layer.type === "layer") {
      return layer;
    }
  }
  throw new Error(`No layer found at index ${index.join(", ")}`);
}
