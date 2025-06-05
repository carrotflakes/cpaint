import { useEffect, useRef } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { Op } from "../model/op";
import { State, StateRender } from "../model/state";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";
import { Rect, TransformRectHandles } from "./TransformRectHandles";

export default function AddImageAsLayer() {
  const store = useAppState();
  const addImageAsLayer =
    store.mode.type === "addImageAsLayer" ? store.mode : null;

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useViewControl(containerRef, true);

  useEffect(() => {
    if (!addImageAsLayer) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    StateRender(store.stateContainer.state, ctx, null);

    const { image, rect } = addImageAsLayer;
    renderImage(ctx, image, rect);
  }, [addImageAsLayer?.rect, canvasRef]);

  if (!addImageAsLayer) {
    return "Oops, not in addImageAsLayer mode";
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
        {addImageAsLayer && (
          <TransformRectHandles
            rect={addImageAsLayer.rect}
            onRectChange={(rect) => {
              store.update((draft) => {
                if (draft.mode.type === "addImageAsLayer")
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
            if (!addImageAsLayer) return;
            applyAddImageAsLayer(addImageAsLayer);
          }}
        >
          Apply
        </div>
      </div>
    </div>
  );
}

function applyAddImageAsLayer(addImageAsLayer: {
  image: OffscreenCanvas;
  rect: Rect;
}) {
  const store = useAppState.getState();
  const { width, height } = store.stateContainer.state.layers[0].canvas;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
  })!;

  const { image, rect } = addImageAsLayer;
  renderImage(ctx, image, rect);

  const op: Op = {
    type: "patch",
    patches: [
      {
        op: "add",
        path: `/layers/${store.stateContainer.state.layers.length}`,
        value: {
          id: `${Date.now() % 1000000}`,
          canvas,
          visible: true,
          opacity: 1,
          blendMode: "source-over",
        } satisfies State["layers"][number],
      },
    ],
  };
  store.apply(op, null);
  store.update((draft) => {
    draft.mode = { type: "draw" };
  });
}

function renderImage(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  image: OffscreenCanvas,
  rect: Rect
) {
  ctx.save();
  ctx.translate(rect.cx, rect.cy);
  ctx.rotate(rect.angle);
  ctx.scale((rect.hw * 2) / image.width, (rect.hh * 2) / image.height);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}
