import { MCanvas } from "@/libs/MCanvas";
import { Selection } from "@/libs/Selection";
import { BlendMode } from "@/model/blendMode";
import { pushToast } from "../components/Toasts";
import { ImageData, storage } from "../libs/Storage";
import { computeNextLayerIdFromLayers, Layer, LayerGroup } from "../model/state";
import { useAppState } from "./appState";

export async function save() {
  const state = useAppState.getState();
  const meta = state.imageMeta;

  if (!meta) return;

  async function mapLayers(layers: readonly (Layer | LayerGroup)[]): Promise<ImageData["layers"]> {
    return Promise.all(layers.map(async (layer) => layer.type === "layer" ? {
      type: "layer",
      id: layer.id,
      canvas: await layer.canvas.getCanvas().convertToBlob(),
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      locked: layer.locked,
    }
      : {
        type: "group",
        id: layer.id,
        layers: await mapLayers(layer.layers),
        visible: layer.visible,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        locked: layer.locked,
      }));
  }

  try {
    const thumbnail = await createThumbnail();
    const layers = await mapLayers(state.stateContainer.state.layers);
    const selection = state.stateContainer.state.selection?.toStorable() ?? null;
    const imageData: ImageData = {
      layers,
      selection,
      size: state.stateContainer.state.size,
      colorHistory: state.uiState.colorHistory,
    };
    await storage.putImage(meta, imageData, thumbnail);

    // Mark as saved after successful save
    state.update((s) => {
      s.savedState = s.stateContainer.state;
    });

    pushToast("Saved", {
      autoHide: true,
      type: "success",
    });
  } catch (error) {
    console.error("Failed to save image:", error);
    pushToast("Failed to save image: " + error, { type: "error" });
  }
}

function createThumbnail() {
  const state = useAppState.getState();
  const canvasSize = state.canvasSize();
  const canvas = new OffscreenCanvas(canvasSize.width, canvasSize.height);
  const ctx = canvas.getContext("2d")!;
  state.stateContainer.renderer.render(state.stateContainer.state, ctx, null);
  return canvas.convertToBlob();
}

export async function loadImage(id: number) {
  const imageMeta = await storage.getImageMeta(id);
  const imageData = await storage.getImage(id);
  if (!imageMeta || !imageData) {
    pushToast("Loading image failed", { type: "error" });
    return;
  }

  async function mapLayers(
    layers: ImageData["layers"]
  ): Promise<(Layer | LayerGroup)[]> {
    return Promise.all(layers.map(async (layerData) => {
      if (layerData.type === "layer") {
        const image = await blobToImage(layerData.canvas);
        const canvas = new MCanvas(image.width, image.height);
        const ctx = canvas.getContextWrite();
        ctx.drawImage(image, 0, 0);
        return {
          type: "layer",
          id: layerData.id,
          canvas,
          visible: layerData.visible,
          opacity: layerData.opacity,
          blendMode: layerData.blendMode as BlendMode,
          locked: layerData.locked,
        };
      } else {
        return {
          type: "group",
          id: layerData.id,
          layers: await mapLayers(layerData.layers),
          visible: layerData.visible,
          opacity: layerData.opacity,
          blendMode: layerData.blendMode as BlendMode,
          locked: layerData.locked,
        };
      }
    }));
  }

  const layers: (Layer | LayerGroup)[] = await mapLayers(imageData.layers);
  const selection = imageData.selection
    ? await Selection.fromStorable(imageData.selection)
    : null;

  const state = {
    layers,
    selection,
    size: imageData.size,
    nextLayerId: computeNextLayerIdFromLayers(
      layers
    ),
  };
  useAppState.getState().open(imageMeta, state, imageData.colorHistory || []);
}

function blobToImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = URL.createObjectURL(blob);
  });
}
