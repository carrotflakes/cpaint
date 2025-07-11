import { useEffect, useRef } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { Op } from "../model/op";
import { State } from "../model/state";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";
import {
  makeApply,
  Rect,
  TransformRectHandles,
} from "./overlays/TransformRectHandles";
import { MCanvas } from "../libs/MCanvas";

export default function CanvasResize() {
  const store = useAppState();
  const canvasResize = store.mode.type === "canvasResize" ? store.mode : null;

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useViewControl(containerRef);

  useEffect(() => {
    if (!canvasResize) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    makeApply(null, canvasResize.rendered, canvasResize.rect)(ctx);
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

  function mapLayer(layer: State["layers"][number]): State["layers"][number] {
    if (layer.type === "layer") {
      const canvas = new MCanvas(canvasResize.size[0], canvasResize.size[1]);
      const ctx = canvas.getContextWrite();
      makeApply(null, layer.canvas, canvasResize.rect)(ctx);
      return {
        ...layer,
        canvas,
      };
    } else {
      return {
        ...layer,
        layers: layer.layers.map(mapLayer),
      };
    }
  }

  const layers = store.stateContainer.state.layers.map(mapLayer);

  const op: Op = {
    type: "patch",
    name: "Resize Canvas",
    patches: [
      {
        op: "replace",
        path: ["layers"],
        value: layers satisfies State["layers"],
      },
      {
        op: "replace",
        path: ["size"],
        value: {
          width: canvasResize.size[0],
          height: canvasResize.size[1],
        } satisfies State["size"],
      },
    ],
  };
  store.apply(op, null);
  store.update((draft) => {
    draft.mode = { type: "draw" };
  });
}
