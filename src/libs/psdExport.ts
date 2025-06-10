import { type BlendMode, type Layer, type Psd, writePsd } from "ag-psd";
import { BlendMode as CBlendMode } from "../model/blendMode";
import type { State } from "../model/state";

// Blend mode mapping (Photoshop compatible)
const BLEND_MODE_MAP: Record<CBlendMode, BlendMode | null> = {
  "source-over": "normal",
  "multiply": "multiply",
  "screen": "screen",
  "overlay": "overlay",
  "darken": "darken",
  "lighten": "lighten",
  "color-dodge": "color dodge",
  "color-burn": "color burn",
  "hard-light": "hard light",
  "soft-light": "soft light",
  "difference": "difference",
  "exclusion": "exclusion",
  "hue": "hue",
  "saturation": "saturation",
  "color": "color",
  "luminosity": "luminosity",
  "lighter": null,
  "destination-atop": null,
  "destination-in": null,
  "destination-out": null,
  "destination-over": null,
  "source-atop": null,
  "source-in": null,
  "source-out": null,
  "copy": null,
  "xor": null,
};

export async function exportToPSD(
  state: State
) {
  if (!state.layers || state.layers.length === 0) {
    throw new Error("No layers available for export");
  }

  const firstLayer = state.layers[0];
  const { width, height } = firstLayer.canvas;

  // Track unsupported blend modes
  const unsupportedBlendModes = new Set<string>();

  // Create PSD layer data
  const psdLayers: Layer[] = await Promise.all(
    state.layers
      .map(async (layer, index) => {
        const imageData = await canvasToImageData(layer.canvas.getCanvas());

        // Check if blend mode is supported
        const blendMode = BLEND_MODE_MAP[layer.blendMode];
        if (!blendMode) {
          unsupportedBlendModes.add(layer.blendMode);
        }

        return {
          name: layer.id || `Layer ${index + 1}`,
          hidden: !layer.visible,
          opacity: layer.opacity, // ag-psd uses 0-1 range
          blendMode: blendMode ?? "normal",
          left: 0,
          top: 0,
          right: width,
          bottom: height,
          imageData,
        };
      })
  );

  // Create composite image
  const compositeCanvas = new OffscreenCanvas(width, height);
  const compositeCtx = compositeCanvas.getContext("2d")!;

  // Composite all layers
  for (const layer of state.layers) {
    if (!layer.visible) continue;

    compositeCtx.save();
    compositeCtx.globalAlpha = layer.opacity;
    compositeCtx.globalCompositeOperation = layer.blendMode satisfies GlobalCompositeOperation;
    compositeCtx.drawImage(layer.canvas.getCanvas(), 0, 0);
    compositeCtx.restore();
  }

  const compositeImageData = await canvasToImageData(compositeCanvas);

  // Create PSD document structure
  const psd: Psd = {
    width,
    height,
    children: psdLayers,
    imageData: compositeImageData,
  };

  // Generate PSD file
  const buffer = writePsd(psd, {
    generateThumbnail: true,
    trimImageData: false,
  });

  return { buffer, unsupportedBlendModes };
}

async function canvasToImageData(canvas: OffscreenCanvas) {
  const ctx = canvas.getContext("2d")!;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
