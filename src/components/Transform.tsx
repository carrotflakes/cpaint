import { StateContainerRender } from "@/model/stateContainer";
import { useEffect, useMemo, useRef } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { MCanvas } from "../libs/MCanvas";
import { Selection } from "../libs/Selection";
import { findLayerById } from "../model/state";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";
import {
  makeApply,
  TransformRectHandles,
} from "./overlays/TransformRectHandles";

export default function Transform() {
  const store = useAppState();
  const layerTransform =
    store.mode.type === "layerTransform" ? store.mode : null;

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  const canvases = useMemo(() => {
    if (!layerTransform) return null;

    const layer = findLayerById(
      store.stateContainer.state.layers,
      layerTransform.layerId
    );
    if (layer?.type !== "layer") {
      throw new Error("Not a valid layer for transformation");
    }
    const canvas = layer.canvas;

    let selection = store.stateContainer.state.selection;
    if (!selection) {
      const bbox = canvas.getBbox();
      if (!bbox) throw new Error("Canvas is empty");
      selection = new Selection(canvas.width, canvas.height);
      selection.addRect(bbox.x, bbox.y, bbox.width, bbox.height, "new");
    }

    return splitCanvasBySelection(canvas, selection);
  }, [
    store.stateContainer.state.layers,
    store.stateContainer.state.selection,
    layerTransform?.layerId,
  ]);

  useViewControl(containerRef);

  const layerMod = useMemo(() => {
    if (!layerTransform || !canvases) return null;

    return {
      layerId: layerTransform.layerId,
      apply: makeApply(canvases.base, canvases.target, layerTransform.rect),
      rect: "full" as const, // TODO
    };
  }, [layerTransform, canvases]);

  useEffect(() => {
    if (!layerMod) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    StateContainerRender(store.stateContainer, ctx, layerMod);
  }, [store.stateContainer, canvasRef, layerMod]);

  if (!layerTransform) {
    return "Oops, not in transform mode🤔";
  }

  const canvasSize = store.canvasSize();
  return (
    <div className="relative w-full h-full">
      <CanvasArea
        canvasSize={canvasSize}
        canvasView={store.uiState.canvasView}
        containerRef={containerRef}
        canvasRef={canvasRef}
      >
        {layerTransform && (
          <TransformRectHandles
            rect={layerTransform.rect}
            onRectChange={(rect) => {
              store.update((draft) => {
                if (draft.mode.type === "layerTransform")
                  draft.mode.rect = rect;
              });
            }}
            canvasSize={canvasSize}
          />
        )}
      </CanvasArea>

      <div className="absolute top-2 left-2 flex gap-2">
        <div
          className="p-2 rounded bg-gray-200 cursor-pointer"
          onClick={() => {
            store.update((draft) => {
              draft.mode = { type: "draw" };
            });
          }}
        >
          Cancel
        </div>
        <div
          className="p-2 rounded bg-gray-200 cursor-pointer"
          onClick={() => {
            if (!layerTransform || !canvases) return;

            const op = {
              type: "layerTransform" as const,
              layerId: layerTransform.layerId,
              rect: layerTransform.rect,
            };

            store.apply(op, layerMod);
            store.update((draft) => {
              draft.mode = { type: "draw" };
            });
          }}
        >
          Apply
        </div>
      </div>
    </div>
  );
}

function splitCanvasBySelection(canvas: MCanvas, selection: Selection) {
  const bbox = selection.getBounds();
  if (!bbox) throw new Error("Selection bounds not found");

  const ctx = canvas.getContextRead();
  const baseID = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const targetID = ctx.getImageData(0, 0, canvas.width, canvas.height);

  selection.clipImageData(targetID);
  const target = new MCanvas(bbox.width, bbox.height);
  target.getContextWrite().putImageData(targetID, -bbox.x, -bbox.y);

  const selectionInverted = selection.clone();
  selectionInverted.invert();
  selectionInverted.clipImageData(baseID);
  const base = new MCanvas(canvas.width, canvas.height);
  base.getContextWrite().putImageData(baseID, 0, 0);

  return { base, target };
}
