import { StateContainerRender } from "@/model/stateContainer";
import { useEffect, useRef } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { MCanvas } from "../libs/MCanvas";
import { Op } from "../model/op";
import {
  DEFAULT_LAYER_PROPS,
  newLayerId,
  State
} from "../model/state";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";
import { Rect, TransformRectHandles } from "./overlays/TransformRectHandles";

export default function AddImageAsLayer() {
  const store = useAppState();
  const addImageAsLayer =
    store.mode.type === "addImageAsLayer" ? store.mode : null;

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useViewControl(containerRef);

  useEffect(() => {
    if (!addImageAsLayer) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    StateContainerRender(store.stateContainer, ctx);

    const { image, rect } = addImageAsLayer;
    renderImage(ctx, image, rect);
  }, [addImageAsLayer?.rect, canvasRef]);

  if (!addImageAsLayer) {
    return "Oops, not in addImageAsLayer mode";
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
        {addImageAsLayer && (
          <TransformRectHandles
            rect={addImageAsLayer.rect}
            onRectChange={(rect) => {
              store.update((draft) => {
                if (draft.mode.type === "addImageAsLayer")
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

function applyAddImageAsLayer(addImageAsLayer: { image: MCanvas; rect: Rect }) {
  const store = useAppState.getState();
  const { width, height } = store.canvasSize();

  const canvas = new MCanvas(width, height);
  const ctx = canvas.getContextWrite();

  const { image, rect } = addImageAsLayer;
  renderImage(ctx, image, rect);

  const op: Op = {
    type: "patch",
    name: "Add Image as Layer",
    patches: [
      {
        op: "add",
        path: ["layers", store.stateContainer.state.layers.length],
        value: {
          ...DEFAULT_LAYER_PROPS,
          type: "layer",
          id: newLayerId(store.stateContainer.state),
          canvas,
        } satisfies State["layers"][number],
      },
      {
        op: "replace",
        path: ["nextLayerId"],
        value: (store.stateContainer.state.nextLayerId +
          1) satisfies State["nextLayerId"],
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
  image: MCanvas,
  rect: Rect
) {
  ctx.save();
  ctx.translate(rect.cx, rect.cy);
  ctx.rotate(rect.angle);
  ctx.scale((rect.hw * 2) / image.width, (rect.hh * 2) / image.height);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image.getCanvas(), 0, 0);
  ctx.restore();
}
