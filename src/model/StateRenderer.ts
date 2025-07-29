import { MCanvas } from "@/libs/MCanvas";
import { Layer, LayerGroup, State } from "./state";

// TODO: Show redraw area for debugging purposes
const SHOW_REDRW_AREA = false;

export class StateRenderer {
  private size: { width: number; height: number };
  private cache: Map<string, { canvas: MCanvas, used: boolean, identity: Node[] }> = new Map();
  private tmpCanvas: OffscreenCanvas;
  private modified: LayerMod | null = null;

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

    const nodes = state.layers.map(layerToNode);
    const canvas = this.renderGroup("", nodes, layerMod ?? this.modified);
    ctx.drawImage(canvas, 0, 0);

    if (SHOW_REDRW_AREA && layerMod) {
      ctx.fillStyle = "#f00";
      ctx.globalAlpha = 0.25;
      if (layerMod.rect === "full") {
        ctx.fillRect(0, 0, this.size.width, this.size.height);
      } else if (typeof layerMod.rect === "object") {
        ctx.fillRect(layerMod.rect.x, layerMod.rect.y, layerMod.rect.width, layerMod.rect.height);
      }
      ctx.globalAlpha = 1;
    }

    {
      for (const [key, v] of this.cache.entries()) {
        if (!v.used)
          this.cache.delete(key);
      }
    }

    this.modified = layerMod ? {
      layerId: layerMod.layerId,
      apply: () => { },
      rect: layerMod.rect,
    } : null;
  }

  private renderGroup(
    id: string,
    nodes: Node[],
    layerMod: LayerMod | null,
  ) {
    if (!this.cache.has(id)) {
      this.cache.set(id, {
        canvas: new MCanvas(this.size.width, this.size.height),
        used: false,
        identity: [],
      });
    }
    const entry = this.cache.get(id)!;
    entry.used = true;
    const canvas = entry.canvas;

    const rect = NodesEq(entry.identity, nodes) ? this.redrawRect(nodes, layerMod) : "full";
    if (rect) {
      const ctx2 = canvas.getContextWrite();
      ctx2.save();

      // Clip
      if (typeof rect === "object") {
        ctx2.beginPath();
        ctx2.rect(rect.x, rect.y, rect.width, rect.height);
        ctx2.clip();
      }

      this.renderLayers(nodes, layerMod, ctx2);
      ctx2.restore();
      entry.identity = nodes;
    }
    return canvas.getCanvas();
  }

  private renderLayers(nodes: Node[], layerMod: LayerMod | null, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
    ctx.clearRect(0, 0, this.size.width, this.size.height);

    for (const item of nodes) {
      if (!item.source.visible) continue; // Skip rendering invisible items

      ctx.globalAlpha = item.source.opacity;
      ctx.globalCompositeOperation = item.source.blendMode;

      if ("nodes" in item) {
        const canvas = this.renderGroup(item.source.id, item.nodes, layerMod);
        ctx.drawImage(canvas, 0, 0);
      } else {
        const layer = item;
        if (layer.source.id === layerMod?.layerId) {
          const layerCtx = this.tmpCanvas.getContext("2d", { willReadFrequently: true })!;
          layerCtx.clearRect(0, 0, this.size.width, this.size.height);
          layerCtx.drawImage(layer.source.canvas.getCanvas(), 0, 0);
          layerCtx.save();
          layerMod.apply(layerCtx);
          layerCtx.restore();

          ctx.drawImage(this.tmpCanvas, 0, 0);
        } else {
          ctx.drawImage(layer.source.canvas.getCanvas(), 0, 0);
        }
      }
    }
  }

  getCacheCanvas(layerId: string): MCanvas | null {
    const entry = this.cache.get(layerId);
    return entry?.canvas ?? null;
  }

  private redrawRect(nodes: Node[], layerMod: LayerMod | null): Rect | null {
    for (const item of nodes) {
      if ("nodes" in item) {
        const rect = this.redrawRect(item.nodes, layerMod);
        if (rect) return rect;
      } else if (item.source.id === layerMod?.layerId) {
        if (layerMod.rect === "none") return null;
        if (layerMod.rect === "full")
          return {
            x: 0,
            y: 0,
            ...this.size,
          };
        return layerMod.rect;
      }
    }
    return null;
  }
}

type Node = {
  source: Layer;
  canvasVersion: Symbol;
} | {
  source: LayerGroup;
  nodes: Node[];
};

function layerToNode(layer: Layer | LayerGroup): Node {
  if (layer.type === "layer") {
    return {
      source: layer,
      canvasVersion: layer.canvas.getVersion(),
    };
  } else {
    return {
      source: layer,
      nodes: layer.layers.map(layerToNode),
    };
  }
}

function NodesEq(as: Node[], bs: Node[]): boolean {
  if (as.length !== bs.length) return false;
  for (let i = 0; i < as.length; i++) {
    const a = as[i];
    const b = bs[i];
    if ((["type", "id", "blendMode", "opacity", "visible"] as const).some(key => a.source[key] !== b.source[key])) return false;
    if ("canvasVersion" in a && "canvasVersion" in b && a.canvasVersion !== b.canvasVersion) return false;
    if ("nodes" in a && "nodes" in b && !NodesEq(a.nodes, b.nodes)) return false;
  }
  return true;
}

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayerMod = {
  layerId: string;
  apply: (ctx: OffscreenCanvasRenderingContext2D) => void;
  rect: Rect | "none" | "full";
}
