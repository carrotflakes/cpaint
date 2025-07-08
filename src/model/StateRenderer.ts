import { MCanvas } from "@/libs/MCanvas";
import { State } from "./state";

export class StateRenderer {
  private size: { width: number; height: number };
  private cache: Map<string, { canvas: MCanvas, used: boolean }> = new Map();
  private tmpCanvas: OffscreenCanvas;

  constructor(width: number, height: number) {
    this.size = { width, height };
    this.tmpCanvas = new OffscreenCanvas(width, height);
  }

  render(state: State, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, layerMod: LayerMod | null): void {
    {
      if (this.size.width !== state.size.width || this.size.height !== state.size.height) {
        this.size = state.size;
        this.cache.clear();
        this.tmpCanvas = new OffscreenCanvas(this.size.width, this.size.height);
      } else {
        for (const v of this.cache.values())
          v.used = false;
      }
    }

    this.renderLayers(state.layers, ctx, layerMod);

    {
      for (const [key, v] of this.cache.entries()) {
        if (!v.used)
          this.cache.delete(key);
      }
    }
  }

  private renderLayers(layers: State["layers"], ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, layerMod: LayerMod | null): void {
    ctx.clearRect(0, 0, this.size.width, this.size.height);

    for (const item of layers) {
      if (!item.visible) continue; // Skip rendering invisible items

      ctx.globalAlpha = item.opacity;
      ctx.globalCompositeOperation = item.blendMode;

      if (item.type === "group") {
        if (!this.cache.has(item.id)) {
          this.cache.set(item.id, {
            canvas: new MCanvas(this.size.width, this.size.height),
            used: false,
          });
        }
        const entry = this.cache.get(item.id)!;
        entry.used = true;
        const canvas = entry.canvas;

        const ctx2 = canvas.getContextWrite();
        this.renderLayers(item.layers, ctx2, layerMod);
        ctx.drawImage(canvas.getCanvas(), 0, 0);
        console.log(item)
      } else {
        const layer = item;
        if (layer.id === layerMod?.layerId) {
          const layerCtx = this.tmpCanvas.getContext("2d", { willReadFrequently: true })!;
          layerCtx.clearRect(0, 0, this.size.width, this.size.height);
          layerCtx.drawImage(layer.canvas.getCanvas(), 0, 0);
          layerCtx.save();
          layerMod.apply(layerCtx);
          layerCtx.restore();

          ctx.drawImage(this.tmpCanvas, 0, 0);
        } else {
          ctx.drawImage(layer.canvas.getCanvas(), 0, 0);
        }
      }
    }
  }
}

export type LayerMod = {
  layerId: string;
  apply: (ctx: OffscreenCanvasRenderingContext2D) => void;
}
