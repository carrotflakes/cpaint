import { useEffect, useRef } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { StateRender } from "../model/state";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";
import { makeApply, TransformRectHandles } from "./TransformRectHandles";

export default function Transform() {
  const store = useAppState();
  const layerTransform =
    store.mode.type === "layerTransform" ? store.mode : null;

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useViewControl(containerRef, true);

  useEffect(() => {
    if (!layerTransform) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const layer =
      store.stateContainer.state.layers[layerTransform.layerIndex ?? 0];
    const touch = {
      layerId: layer.id,
      apply: makeApply(layer.canvas, layerTransform.rect),
    };
    StateRender(store.stateContainer.state, ctx, touch);
  }, [store, canvasRef]);

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
            if (!layerTransform) return;
            const op = {
              type: "layerTransform" as const,
              layerIndex: layerTransform.layerIndex,
              rect: layerTransform.rect,
            };

            const layer =
              store.stateContainer.state.layers[layerTransform.layerIndex ?? 0];
            store.apply(op, makeApply(layer.canvas, layerTransform.rect));
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
