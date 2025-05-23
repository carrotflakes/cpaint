import { useCallback, useEffect, useRef, useState } from "react";
import { useViewControlByWheel } from "../hooks/useViewControlByWheel";
import {
  calculateTransformedPoint,
  dist,
  normalizeAngle,
  Pos,
} from "../libs/geometry";
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
  useViewControlByWheel(containerRef);

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
      canvasSize={firstCanvas}
      canvasView={store.uiState.canvasView}
      containerRef={containerRef}
      canvasRef={canvasRef}
    >
      <CursorIndicator containerRef={containerRef} />
    </CanvasArea>
  );
}

function useControl(
  canvasRef: { current: HTMLCanvasElement | null },
  containerRef: { current: HTMLDivElement | null },
  touchRef: { current: Touch | null },
  redraw: () => void
) {
  const { fingerOperations } = useGlobalSettings((state) => state);

  const stateRef = useRef<
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
        stateRef.current?.type !== "drawing" &&
        e.button === 0 &&
        !(fingerOperations && e.pointerType === "touch")
      ) {
        const path = [{ pos, size: e.pressure }];
        touchRef.current = createTouch(store);
        if (touchRef.current == null) return;
        touchRef.current.stroke(pos[0], pos[1], e.pressure);

        stateRef.current = {
          type: "drawing",
          path,
          lastPos: pos,
          pointerId: e.pointerId,
        };
        return;
      }

      if (stateRef.current == null) {
        // Middle button to pan
        if (e.pointerType === "mouse" && e.button === 1) {
          stateRef.current = {
            type: "translate",
            pointerId: e.pointerId,
          };
          return;
        }

        stateRef.current = {
          type: "panning",
          pointers: [{ id: e.pointerId, pos: [e.clientX, e.clientY] }],
          angleUnnormalized: store.uiState.canvasView.angle,
        };
        return;
      }

      if (stateRef.current.type === "panning") {
        if (stateRef.current.pointers.length < 2)
          stateRef.current.pointers.push({
            id: e.pointerId,
            pos: [e.clientX, e.clientY],
          });
        return;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!canvasRef.current || !containerRef.current || !stateRef.current)
        return;

      if (stateRef.current.type === "drawing") {
        if (e.pointerId !== stateRef.current.pointerId) return;
        const pos = computePos(e, containerRef.current);

        const { path, lastPos } = stateRef.current;
        if (dist(lastPos, pos) > 3) {
          path.push({ pos, size: e.pressure });
          touchRef.current?.stroke(pos[0], pos[1], e.pressure);
          stateRef.current.lastPos = pos;
          redraw();
        }
        return;
      }

      if (stateRef.current.type === "panning") {
        const pi = stateRef.current.pointers.findIndex(
          (p) => p.id === e.pointerId
        );
        if (pi !== -1) {
          if (stateRef.current.pointers.length === 2) {
            const ps = stateRef.current.pointers;
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
              (stateRef.current.angleUnnormalized + (a2 - a1)) % (2 * Math.PI);
            stateRef.current.angleUnnormalized = angleUnnormalized;
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
            stateRef.current.pointers[pi].pos = [e.clientX, e.clientY];
          }
        }
        return;
      }

      if (stateRef.current.type === "translate") {
        if (e.pointerId === stateRef.current.pointerId) {
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
      if (!canvasRef.current || !containerRef.current || !stateRef.current)
        return;

      const store = useAppState.getState();

      if (stateRef.current.type === "drawing") {
        if (
          e.pointerId !== stateRef.current.pointerId ||
          touchRef.current == null
        )
          return;

        const { path, lastPos } = stateRef.current;
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
              alphaLock: store.uiState.alphaLock,
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
        stateRef.current = null;
        return;
      }

      if (stateRef.current.type === "panning") {
        stateRef.current.pointers = stateRef.current.pointers.filter(
          (p) => p.id !== e.pointerId
        );
        return;
      }

      if (stateRef.current.type === "translate") {
        if (e.pointerId === stateRef.current.pointerId) {
          stateRef.current = null;
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
  }, [canvasRef, containerRef, touchRef, redraw, fingerOperations]);
}

function CursorIndicator({
  containerRef,
}: {
  containerRef: { current: HTMLDivElement | null };
}) {
  const store = useAppState();
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      });
    };
    const handlePointerLeave = () => {
      setCursorPos(null);
    };
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [containerRef]);

  if (store.uiState.tool !== "brush" || !cursorPos) return null;

  return (
    <circle
      cx={cursorPos.x}
      cy={cursorPos.y}
      r={(store.uiState.penSize / 2) * store.uiState.canvasView.scale}
      stroke={store.uiState.color}
      strokeWidth={1}
      fill="none"
      pointerEvents="none"
    />
  );
}
