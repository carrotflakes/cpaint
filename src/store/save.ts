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
  const c = state.stateContainer.state.layers[0].canvas;
  const canvas = new OffscreenCanvas(c.width, c.height);
  const ctx = canvas.getContext("2d")!;
  StateRender(state.stateContainer.state.layers, ctx, null);
  return canvas.convertToBlob();
}
