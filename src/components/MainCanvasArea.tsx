import { useCallback, useEffect, useRef, useState } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { Touch } from "../libs/touch";
import { Op } from "../model/op";
import { StateRender } from "../model/state";
import { createTouch, useAppState } from "../store/appState";
import { useGlobalSettings } from "../store/globalSetting";
import CanvasArea, { computePos } from "./CanvasArea";

export default function MainCanvasArea() {
  const store = useAppState();
  const touchRef = useRef<Touch | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    setUpdatedAt(Date.now());
  }, []);
  useControl(canvasRef, containerRef, touchRef, redraw);
  useViewControl(containerRef);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const touch_ = touchRef.current;
    const touch =
      touch_ &&
      store.uiState.layerIndex < store.stateContainer.state.layers.length
        ? {
            layerId:
              store.stateContainer.state.layers[store.uiState.layerIndex].id,
            apply: (ctx: OffscreenCanvasRenderingContext2D) => {
              touch_.transfer(ctx);
            },
          }
        : null;
    StateRender(store.stateContainer.state, ctx, touch);
  }, [store, canvasRef, touchRef, updatedAt]);

  const firstCanvas = store.stateContainer.state.layers[0].canvas;
  return (
    <CanvasArea
      canvas={firstCanvas}
      canvasView={store.uiState.canvasView}
      containerRef={containerRef}
      canvasRef={canvasRef}
    />
  );
}

function useControl(
  canvasRef: { current: HTMLCanvasElement | null },
  containerRef: { current: HTMLDivElement | null },
  touchRef: { current: Touch | null },
  redraw: () => void
) {
  const { fingerOperations } = useGlobalSettings((state) => state);

  const state = useRef<
    | null
    | {
        type: "drawing";
        path: any[];
        lastPos: [number, number];
        pointerId: number;
      }
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
      const pos = computePos(e, containerRef.current);

      const store = useAppState.getState();

      if (
        state.current?.type !== "drawing" &&
        e.button === 0 &&
        !(fingerOperations && e.pointerType === "touch")
      ) {
        const path = [{ pos, size: e.pressure }];
        touchRef.current = createTouch(store);
        if (touchRef.current == null) return;
        touchRef.current.stroke(pos[0], pos[1], e.pressure);

        state.current = {
          type: "drawing",
          path,
          lastPos: pos,
          pointerId: e.pointerId,
        };
        return;
      }

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

      if (state.current.type === "drawing") {
        if (e.pointerId !== state.current.pointerId) return;
        const pos = computePos(e, containerRef.current);

        const { path, lastPos } = state.current;
        if (dist(lastPos, pos) > 3) {
          path.push({ pos, size: e.pressure });
          touchRef.current?.stroke(pos[0], pos[1], e.pressure);
          state.current.lastPos = pos;
          redraw();
        }
        return;
      }

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

      const store = useAppState.getState();

      if (state.current.type === "drawing") {
        if (e.pointerId !== state.current.pointerId || touchRef.current == null)
          return;

        const { path, lastPos } = state.current;
        const pos = computePos(e, containerRef.current);

        // If the pointer is moved, we need to add the last position
        if (dist(lastPos, pos) > 0) {
          path.push({ pos, size: e.pressure });
          touchRef.current.stroke(pos[0], pos[1], 0);
        }

        apply: {
          touchRef.current.end();
          if (store.uiState.tool === "fill") {
            const op: Op = {
              type: "fill",
              fillColor: store.uiState.color,
              opacity: store.uiState.opacity,
              erace: store.uiState.erase,
              path,
              layerIndex: store.uiState.layerIndex,
            };
            store.apply(op, touchRef.current.transfer);
          } else if (store.uiState.tool === "brush") {
            const op: Op = {
              type: "stroke",
              erase: store.uiState.erase,
              strokeStyle: {
                color: store.uiState.color,
                brushType: store.uiState.brushType,
                width: store.uiState.penSize,
              },
              opacity: store.uiState.opacity,
              path,
              layerIndex: store.uiState.layerIndex,
            };
            store.apply(op, touchRef.current.transfer);
          } else if (store.uiState.tool === "bucketFill") {
            const op: Op = {
              type: "bucketFill",
              fillColor: store.uiState.color,
              opacity: store.uiState.opacity,
              erace: store.uiState.erase,
              tolerance: store.uiState.bucketFillTolerance,
              pos: [pos[0], pos[1]],
              layerIndex: store.uiState.layerIndex,
            };
            store.apply(op, touchRef.current.transfer);
          }
        }
        touchRef.current = null;
        state.current = null;
        return;
      }

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
      window.addEventListener("pointercancel", onPointerUp);
    };
  }, [canvasRef, containerRef, touchRef, redraw, fingerOperations]);
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
