import { readPsd, type BlendMode as PsdBlendMode, type Layer as psdLayer } from "ag-psd";
import { BlendMode } from "../model/blendMode";
import { MCanvas } from "./MCanvas";
import { Layer, LayerGroup } from "@/model/state";

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
  layers: (Layer | LayerGroup)[];
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

  let layerIndex = 10000;
  function mapLayer(psdLayer: psdLayer): Layer | LayerGroup {
    const props = {
      id: "" + (psdLayer.id ?? layerIndex++),
      visible: !psdLayer.hidden,
      opacity: psdLayer.opacity ?? 1,
      blendMode: BLEND_MODE_MAP[psdLayer.blendMode ?? "normal"] ?? "source-over",
      locked: false,
      name: psdLayer.name,
    };

    if (psdLayer.canvas) {
      const layerCanvas = new MCanvas(psd.width, psd.height);
      const ctx = layerCanvas.getContextWrite();

      const layerLeft = psdLayer.left ?? 0;
      const layerTop = psdLayer.top ?? 0;
      ctx.drawImage(psdLayer.canvas, layerLeft, layerTop);

      return {
        ...props,
        type: "layer",
        canvas: layerCanvas,
      };
    } else if (psdLayer.children) {
      return {
        ...props,
        type: "group",
        layers: psdLayer.children.map(mapLayer),
      };
    }
    console.error('[loadPsdFromFile] Unsupported PSD layer', psdLayer);
    throw new Error(`Invalid PSD layer`);
  }

  const { width, height } = psd;
  const layers: PsdImportResult["layers"] = psd.children ? psd.children.map(mapLayer) : [];

  // If no layers were processed, create a single layer from the composite image
  if (layers.length === 0 && psd.canvas) {
    const canvas = new MCanvas(width, height);
    const ctx = canvas.getContextWrite();

    ctx.drawImage(psd.canvas, 0, 0);

    layers.push({
      type: "layer",
      id: "0",
      canvas,
      visible: true,
      opacity: 1,
      blendMode: "source-over",
      locked: false,
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
