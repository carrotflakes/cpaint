import { useEffect, useRef } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { StateRender } from "../model/state";
import { useAppState } from "../store/appState";
import CanvasArea from "./CanvasArea";
import { Rect, TransformRectHandles } from "./TransformRectHandles";

export default function Transform() {
  const store = useAppState();
  const layerTransform = store.uiState.layerTransform;

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useControl(canvasRef, containerRef);
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
                if (draft.uiState.layerTransform)
                  draft.uiState.layerTransform.rect = rect;
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
              draft.uiState.layerTransform = null;
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
              draft.uiState.layerTransform = null;
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

function useControl(
  canvasRef: { current: HTMLCanvasElement | null },
  containerRef: { current: HTMLDivElement | null }
) {
  const state = useRef<
    | null
    | {
        type: "panning";
        pointers: { id: number; pos: [number, number] }[];
        angleUnnormalized: number;
      }
    | {
        type: "translate";
        pointerId: number;
      }
  >(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      if (!canvasRef.current || !containerRef.current) return;
      const store = useAppState.getState();

      if (state.current == null) {
        // Middle button to pan
        if (e.pointerType === "mouse" && e.button === 1) {
          state.current = {
            type: "translate",
            pointerId: e.pointerId,
          };
          return;
        }

        state.current = {
          type: "panning",
          pointers: [{ id: e.pointerId, pos: [e.clientX, e.clientY] }],
          angleUnnormalized: store.uiState.canvasView.angle,
        };
        return;
      }

      if (state.current.type === "panning") {
        if (state.current.pointers.length < 2)
          state.current.pointers.push({
            id: e.pointerId,
            pos: [e.clientX, e.clientY],
          });
        return;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!canvasRef.current || !containerRef.current || !state.current) return;

      if (state.current.type === "panning") {
        const pi = state.current.pointers.findIndex(
          (p) => p.id === e.pointerId
        );
        if (pi !== -1) {
          if (state.current.pointers.length === 2) {
            const ps = state.current.pointers;
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
              (state.current.angleUnnormalized + (a2 - a1)) % (2 * Math.PI);
            state.current.angleUnnormalized = angleUnnormalized;
            useAppState.setState((state) => {
              const prevPan_ = [
                state.uiState.canvasView.pan[0] + panOffset[0],
                state.uiState.canvasView.pan[1] + panOffset[1],
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

              return {
                uiState: {
                  ...state.uiState,
                  canvasView: {
                    ...state.uiState.canvasView,
                    angle: normalizeAngle(angleUnnormalized),
                    scale: (state.uiState.canvasView.scale * d2) / d1,
                    pan,
                  },
                },
              };
            });
          } else {
            state.current.pointers[pi].pos = [e.clientX, e.clientY];
          }
        }
        return;
      }

      if (state.current.type === "translate") {
        if (e.pointerId === state.current.pointerId) {
          useAppState.setState((state) => ({
            uiState: {
              ...state.uiState,
              canvasView: {
                ...state.uiState.canvasView,
                pan: [
                  state.uiState.canvasView.pan[0] + e.movementX,
                  state.uiState.canvasView.pan[1] + e.movementY,
                ],
              },
            },
          }));
        }
        return;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!canvasRef.current || !containerRef.current || !state.current) return;

      if (state.current.type === "panning") {
        state.current.pointers = state.current.pointers.filter(
          (p) => p.id !== e.pointerId
        );
        return;
      }

      if (state.current.type === "translate") {
        if (e.button === 1) {
          state.current = null;
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
  }, [canvasRef, containerRef]);
}

function dist(a: [number, number], b: [number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

const angleGripGrace = 0.05;

function normalizeAngle(angle: number) {
  const a = (angle / (2 * Math.PI)) * 4;
  const b = Math.round(a);
  const d = Math.abs(a - b);
  if (d < angleGripGrace) return (b * (2 * Math.PI)) / 4;
  return angle;
}

type Pos = [number, number];

function calculateTransformedPoint(o: Pos, a1: Pos, a2: Pos, p: Pos): Pos {
  const a1x = a1[0] - o[0];
  const a1y = a1[1] - o[1];
  const a2x = a2[0] - o[0];
  const a2y = a2[1] - o[1];
  const px = p[0] - o[0];
  const py = p[1] - o[1];

  const d = a1x ** 2 + a1y ** 2;
  const a = (a1x * a2x + a1y * a2y) / d;
  const b = (a1x * a2y - a1y * a2x) / d;

  const x = a * px - b * py + o[0];
  const y = b * px + a * py + o[1];
  return [x, y];
}
