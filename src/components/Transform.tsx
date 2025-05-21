import { useEffect, useRef } from "react";
import { useViewControl } from "../hooks/useViewControl";
import {
  calculateTransformedPoint,
  dist,
  normalizeAngle,
  Pos,
} from "../libs/geometry";
import { StateRender } from "../model/state";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";
import { Rect, TransformRectHandles } from "./TransformRectHandles";

export default function Transform() {
  const store = useAppState();
  const layerTransform =
    store.mode.type === "layerTransform" ? store.mode : null;

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useControl(containerRef);
  useViewControl(containerRef);

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
        canvas={firstCanvas}
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

function makeApply(canvas: OffscreenCanvas, rect: Rect) {
  return (ctx: OffscreenCanvasRenderingContext2D) => {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(rect.cx, rect.cy);
    ctx.rotate(rect.angle);
    ctx.scale((rect.hw * 2) / canvas.width, (rect.hh * 2) / canvas.height);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  };
}

// TODO: refactor me
function useControl(containerRef: { current: HTMLDivElement | null }) {
  useEffect(() => {
    let state:
      | null
      | {
          type: "panning";
          pointers: { id: number; pos: [number, number] }[];
          angleUnnormalized: number;
        }
      | {
          type: "translate";
          pointerId: number;
        } = null;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;
      const store = useAppState.getState();

      if (state == null) {
        // Middle button to pan
        if (e.pointerType === "mouse" && e.button === 1) {
          state = {
            type: "translate",
            pointerId: e.pointerId,
          };
          return;
        }

        state = {
          type: "panning",
          pointers: [{ id: e.pointerId, pos: [e.clientX, e.clientY] }],
          angleUnnormalized: store.uiState.canvasView.angle,
        };
        return;
      }

      if (state.type === "panning") {
        if (state.pointers.length < 2)
          state.pointers.push({
            id: e.pointerId,
            pos: [e.clientX, e.clientY],
          });
        return;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!containerRef.current || !state) return;

      if (state.type === "panning") {
        const pi = state.pointers.findIndex((p) => p.id === e.pointerId);
        if (pi !== -1) {
          if (state.pointers.length === 2) {
            const ps = state.pointers;
            const prevPos = ps[pi].pos;
            const d1 = dist(ps[0].pos, ps[1].pos);
            const a1 = Math.atan2(
              ps[0].pos[1] - ps[1].pos[1],
              ps[0].pos[0] - ps[1].pos[0]
            );
            ps[pi].pos = [e.clientX, e.clientY];
            const d2 = dist(ps[0].pos, ps[1].pos);
            const a2 = Math.atan2(
              ps[0].pos[1] - ps[1].pos[1],
              ps[0].pos[0] - ps[1].pos[0]
            );
            const bbox = containerRef.current.getBoundingClientRect();
            const panOffset = [
              bbox.left + bbox.width / 2,
              bbox.top + bbox.height / 2,
            ];
            const angleUnnormalized =
              (state.angleUnnormalized + (a2 - a1)) % (2 * Math.PI);
            state.angleUnnormalized = angleUnnormalized;
            useAppState.getState().update((draft) => {
              const prevPan_ = [
                draft.uiState.canvasView.pan[0] + panOffset[0],
                draft.uiState.canvasView.pan[1] + panOffset[1],
              ] as Pos;
              const pan_ = calculateTransformedPoint(
                ps[1 - pi].pos,
                prevPos,
                ps[pi].pos,
                prevPan_
              );
              const pan = [
                pan_[0] - panOffset[0],
                pan_[1] - panOffset[1],
              ] as Pos;

              draft.uiState.canvasView = {
                pan,
                angle: normalizeAngle(angleUnnormalized),
                scale: (draft.uiState.canvasView.scale * d2) / d1,
              };
            });
          } else {
            state.pointers[pi].pos = [e.clientX, e.clientY];
          }
        }
        return;
      }

      if (state.type === "translate") {
        if (e.pointerId === state.pointerId) {
          useAppState.getState().update((draft) => {
            draft.uiState.canvasView.pan = [
              draft.uiState.canvasView.pan[0] + e.movementX,
              draft.uiState.canvasView.pan[1] + e.movementY,
            ];
          });
        }
        return;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!containerRef.current || !state) return;

      if (state.type === "panning") {
        state.pointers = state.pointers.filter((p) => p.id !== e.pointerId);
        return;
      }

      if (state.type === "translate") {
        if (e.pointerId === state.pointerId) {
          state = null;
        }
        return;
      }
    };

    const el = containerRef.current;
    el?.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp); // FIXME

    return () => {
      el?.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [containerRef]);
}
