import { readPsd, type BlendMode as PsdBlendMode } from "ag-psd";
import { BlendMode } from "../model/blendMode";
import { MCanvas } from "./MCanvas";

// Blend mode mapping from Photoshop to canvas
const BLEND_MODE_MAP: Partial<Record<PsdBlendMode, BlendMode>> = {
  "normal": "source-over",
  "multiply": "multiply",
  "screen": "screen",
  "overlay": "overlay",
  "darken": "darken",
  "lighten": "lighten",
  "color dodge": "color-dodge",
  "color burn": "color-burn",
  "hard light": "hard-light",
  "soft light": "soft-light",
  "difference": "difference",
  "exclusion": "exclusion",
  "hue": "hue",
  "saturation": "saturation",
  "color": "color",
  "luminosity": "luminosity",
};

export interface PsdImportResult {
  width: number;
  height: number;
  layers: {
    id: string;
    canvas: MCanvas;
    visible: boolean;
    opacity: number;
    blendMode: BlendMode;
    name?: string;
  }[];
}

export async function loadPsdFromFile(file: File): Promise<PsdImportResult> {
  const arrayBuffer = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      resolve(e.target?.result);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });

  if (!(arrayBuffer instanceof ArrayBuffer)) {
    throw new Error("Invalid file format");
  }

  const psd = readPsd(arrayBuffer);

  if (!psd) {
    throw new Error("Failed to parse PSD file");
  }

  const { width, height } = psd;
  const layers: PsdImportResult["layers"] = [];

  for (const psdLayer of psd.children ?? []) {
    // Skip layer groups for now - just process regular layers
    if (psdLayer.children) {
      continue;
    }

    if (!psdLayer.canvas) {
      continue;
    }

    const layerCanvas = new MCanvas(width, height);
    const ctx = layerCanvas.getContextWrite();

    const layerLeft = psdLayer.left ?? 0;
    const layerTop = psdLayer.top ?? 0;
    ctx.drawImage(psdLayer.canvas, layerLeft, layerTop);

    const blendMode = BLEND_MODE_MAP[psdLayer.blendMode ?? "normal"] ?? "source-over";

    layers.push({
      id: "" + layers.length,
      canvas: layerCanvas,
      visible: !psdLayer.hidden,
      opacity: psdLayer.opacity ?? 1,
      blendMode,
      name: psdLayer.name,
    });
  }

  // If no layers were processed, create a single layer from the composite image
  if (layers.length === 0 && psd.canvas) {
    const canvas = new MCanvas(width, height);
    const ctx = canvas.getContextWrite();

    ctx.drawImage(psd.canvas, 0, 0);

    layers.push({
      id: "0",
      canvas,
      visible: true,
      opacity: 1,
      blendMode: "source-over",
      name: "Background",
    });
  }

  if (layers.length === 0) {
    throw new Error("No valid layers found in PSD file");
  }

  return {
    width,
    height,
    layers,
  };
}
