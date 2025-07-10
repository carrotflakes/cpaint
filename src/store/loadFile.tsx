import { loadImageFromFile } from "@/libs/loadImageFile";
import { computeNextLayerIdFromLayers, StateFromImage } from "@/model/state";
import { ImageMetaNew, useAppState } from "@/store/appState";
import { pushToast } from "@/components/Toasts";

export async function loadFile(file: File) {
  const fileExtension = file.name.toLowerCase().split(".").pop();

  try {
    if (fileExtension === "psd") {
      const { loadPsdFromFile } = await import("../libs/psdImport");
      const psdData = await loadPsdFromFile(file);
      useAppState.getState().open(ImageMetaNew(file.name), {
        layers: psdData.layers,
        selection: null,
        size: { width: psdData.width, height: psdData.height },
        nextLayerId: computeNextLayerIdFromLayers(psdData.layers),
      });
    } else {
      const img = await loadImageFromFile(file);
      useAppState.getState().open(ImageMetaNew(file.name), StateFromImage(img));
    }
  } catch (e) {
    pushToast("File load failed: " + e, { type: "error" });
  }
}
