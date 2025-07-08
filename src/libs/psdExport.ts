import { StateContainer, StateContainerRender } from "@/model/stateContainer";
import { writePsd, type BlendMode, type Psd, type Layer as PsdLayer } from "ag-psd";
import { BlendMode as CBlendMode } from "../model/blendMode";
import { type Layer, type LayerGroup } from "../model/state";

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
  stateContainer: StateContainer
) {
  const state = stateContainer.state;
  if (!state.layers || state.layers.length === 0) {
    throw new Error("No layers available for export");
  }

  const { width, height } = state.size;

  // Track unsupported blend modes
  const unsupportedBlendModes = new Set<string>();

  // Create PSD layer data
  function mapLayer(layer: Layer | LayerGroup): PsdLayer {
    // Check if blend mode is supported
    const blendMode = BLEND_MODE_MAP[layer.blendMode];
    if (!blendMode) {
      unsupportedBlendModes.add(layer.blendMode);
    }

    const props = {
      name: layer.id,
      hidden: !layer.visible,
      opacity: layer.opacity, // ag-psd uses 0-1 range
      blendMode: blendMode ?? "normal",
      left: 0,
      top: 0,
      right: width,
      bottom: height,
    };
    if (layer.type === "layer") {
      const imageData = canvasToImageData(layer.canvas.getCanvas());

      return {
        ...props,
        imageData,
      };
    } else if (layer.type === "group") {
      return {
        ...props,
        children: layer.layers.map(mapLayer),
      };
    }
    throw new Error(`Invalid layer type: ${layer}`);
  }
  const psdLayers: PsdLayer[] = state.layers.map(mapLayer);

  // Create composite image
  const compositeCanvas = new OffscreenCanvas(width, height);
  const compositeCtx = compositeCanvas.getContext("2d")!;

  // Composite all layers
  StateContainerRender(stateContainer, compositeCtx);

  const compositeImageData = canvasToImageData(compositeCanvas);

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

function canvasToImageData(canvas: OffscreenCanvas) {
  const ctx = canvas.getContext("2d")!;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
