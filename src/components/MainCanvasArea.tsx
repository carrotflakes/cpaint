import { useCallback, useEffect, useRef, useState } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { dist } from "../libs/geometry";
import { Touch } from "../libs/touch";
import { Op } from "../model/op";
import { StateRender } from "../model/state";
import { createTouch, useAppState } from "../store/appState";
import { useGlobalSettings } from "../store/globalSetting";
import CanvasArea, { computePos } from "./CanvasArea";

export default function MainCanvasArea() {
  const store = useAppState();
  const [updatedAt, setUpdatedAt] = useState(0);

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    setUpdatedAt(Date.now());
  }, []);
  const { touchRef } = useControl(containerRef, redraw);
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
  containerRef: { current: HTMLDivElement | null },
  redraw: () => void
) {
  const touchRef = useRef<Touch | null>(null);
  const { fingerOperations } = useGlobalSettings((state) => state);

  const stateRef = useRef<null | {
    type: "drawing";
    path: any[];
    lastPos: [number, number];
    pointerId: number;
  }>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;
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
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!containerRef.current || !stateRef.current) return;

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
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!containerRef.current || !stateRef.current) return;

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

        {
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
    };

    const el = containerRef.current;
    el?.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      el?.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [containerRef, touchRef, redraw, fingerOperations]);

  return { touchRef };
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
