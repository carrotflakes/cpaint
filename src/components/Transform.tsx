import { useEffect, useMemo, useRef } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { StateRender } from "../model/state";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";
import {
  makeApply,
  TransformRectHandles,
} from "./overlays/TransformRectHandles";
import { Selection } from "../libs/selection";
import { MCanvas } from "../libs/mCanvas";

export default function Transform() {
  const store = useAppState();
  const layerTransform =
    store.mode.type === "layerTransform" ? store.mode : null;

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  const canvases = useMemo(() => {
    if (!layerTransform) return null;

    const selection = store.stateContainer.state.selection;
    const canvas =
      store.stateContainer.state.layers[layerTransform.layerIndex ?? 0].canvas;
    if (!selection)
      return {
        base: null,
        target: canvas,
      };

    return splitCanvasBySelection(canvas, selection);
  }, [
    store.stateContainer.state.layers,
    store.stateContainer.state.selection,
    layerTransform?.layerIndex,
  ]);

  useViewControl(containerRef, true);

  useEffect(() => {
    if (!layerTransform || !canvases) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const layer =
      store.stateContainer.state.layers[layerTransform.layerIndex ?? 0];
    const touch = {
      layerId: layer.id,
      apply: makeApply(canvases.base, canvases.target, layerTransform.rect),
    };
    StateRender(store.stateContainer.state.layers, ctx, touch);
  }, [store.stateContainer.state.layers, canvases, canvasRef, layerTransform]);

  if (!layerTransform) {
    return "Oops, not in transform mode🤔";
  }

  const firstCanvas = store.stateContainer.state.layers[0].canvas;
  return (
    <div className="relative w-full h-full">
      <CanvasArea
        canvasSize={firstCanvas}
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
            canvasSize={firstCanvas}
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
              layerIndex: layerTransform.layerIndex,
              rect: layerTransform.rect,
            };

            store.apply(
              op,
              makeApply(canvases.base, canvases.target, layerTransform.rect)
            );
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
  const ctx = canvas.getContextRead();
  const targetID = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const baseID = ctx.getImageData(0, 0, canvas.width, canvas.height);

  selection.clipImageData(targetID);
  const target = new MCanvas(canvas.width, canvas.height);
  target.getContextWrite().putImageData(targetID, 0, 0);

  const selectionInverted = selection.clone();
  selectionInverted.invert();
  selectionInverted.clipImageData(baseID);
  const base = new MCanvas(canvas.width, canvas.height);
  base.getContextWrite().putImageData(baseID, 0, 0);

  return { base, target };
}
