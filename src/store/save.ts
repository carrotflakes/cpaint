import { MCanvas } from "@/libs/MCanvas";
import { Selection } from "@/libs/Selection";
import { BlendMode } from "@/model/blendMode";
import { pushToast } from "../components/Toasts";
import { storage } from "../libs/Storage";
import { StateRender } from "../model/state";
import { useAppState } from "./appState";

export async function save() {
  const state = useAppState.getState();
  const meta = state.imageMeta;

  if (!meta) return;

  try {
    const thumbnail = await createThumbnail();
    const layers = [];
    for (const layer of state.stateContainer.state.layers) {
      const blob = await layer.canvas.getCanvas().convertToBlob();
      layers.push({
        id: layer.id,
        canvas: blob,
        visible: layer.visible,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
      });
    }
    const selection = state.stateContainer.state.selection?.toStorable();
    const imageData = {
      layers,
      selection,
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
  StateRender(state.stateContainer.state.layers, ctx, null);
  return canvas.convertToBlob();
}

export async function loadImage(id: number) {
  const imageMeta = await storage.getImageMeta(id);
  const imageData = await storage.getImage(id);
  if (!imageMeta || !imageData) {
    pushToast("Loading image failed", { type: "error" });
    return;
  }

  const layers: {
    id: string;
    canvas: MCanvas;
    visible: boolean;
    opacity: number;
    blendMode: BlendMode;
    locked: boolean;
  }[] = [];
  for (const layerData of imageData.layers) {
    const image = await blobToImage(layerData.canvas);
    const canvas = new MCanvas(image.width, image.height);
    {
      const ctx = canvas.getContextWrite();
      ctx.drawImage(image, 0, 0);
    }
    layers.push({
      id: layerData.id,
      canvas,
      visible: layerData.visible,
      opacity: layerData.opacity,
      blendMode: layerData.blendMode,
      locked: layerData.locked ?? false,
    });
  }
  const selection = imageData.selection
    ? await Selection.fromStorable(imageData.selection)
    : null;

  const state = {
    layers,
    selection,
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
