import { useEffect, useRef } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { Op } from "../model/op";
import { State } from "../model/state";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";
import { makeApply, Rect, TransformRectHandles } from "./overlays/TransformRectHandles";

export default function CanvasResize() {
  const store = useAppState();
  const canvasResize = store.mode.type === "canvasResize" ? store.mode : null;

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useViewControl(containerRef, true);

  useEffect(() => {
    if (!canvasResize) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    makeApply(canvasResize.rendered, canvasResize.rect)(ctx);
  }, [canvasResize?.rect, canvasRef]);

  if (!canvasResize) {
    return "Oops, not in canvasResize mode";
  }

  const canvasSize = {
    width: canvasResize.size[0],
    height: canvasResize.size[1],
  };
  return (
    <div className="relative w-full h-full">
      <CanvasArea
        canvasSize={canvasSize}
        canvasView={store.uiState.canvasView}
        containerRef={containerRef}
        canvasRef={canvasRef}
      >
        {canvasResize && (
          <TransformRectHandles
            rect={canvasResize.rect}
            onRectChange={(rect) => {
              store.update((draft) => {
                if (draft.mode.type === "canvasResize") draft.mode.rect = rect;
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
            if (!canvasResize) return;
            applyCanvasResize(canvasResize);
          }}
        >
          Apply
        </div>
      </div>
    </div>
  );
}

function applyCanvasResize(canvasResize: {
  size: [number, number];
  rect: Rect;
}) {
  const store = useAppState.getState();

  const layers = store.stateContainer.state.layers.map((layer) => {
    const canvas = new OffscreenCanvas(
      canvasResize.size[0],
      canvasResize.size[1]
    );
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
    })!;
    makeApply(layer.canvas, canvasResize.rect)(ctx);
    return {
      ...layer,
      canvas,
    };
  });

  const op: Op = {
    type: "patch",
    patches: [
      {
        op: "replace",
        path: "/layers",
        value: layers satisfies State["layers"],
      },
    ],
  };
  store.apply(op, null);
  store.update((draft) => {
    draft.mode = { type: "draw" };
  });
}
