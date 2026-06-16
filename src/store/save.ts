import { pushToast } from "../components/Toasts";
import { deserializeDocument, serializeDocument } from "../persistence/document";
import { documentStore } from "../persistence/store";
import { useAppState } from "./appState";

export async function save() {
  const state = useAppState.getState();
  const meta = state.imageMeta;

  if (!meta) return;

  try {
    const thumbnail = await createThumbnail();
    const doc = await serializeDocument(
      state.stateContainer.state,
      state.uiState.colorHistory
    );
    await documentStore.putDocument(meta, doc, thumbnail);

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

export async function loadImage(id: string) {
  const meta = await documentStore.getMeta(id);
  const doc = await documentStore.getDocument(id);
  if (!meta || !doc) {
    pushToast("Loading image failed", { type: "error" });
    return;
  }

  const { state, colorHistory } = await deserializeDocument(doc);
  useAppState.getState().open(meta, state, colorHistory);
}
