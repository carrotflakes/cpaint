import { useEffect, useRef, useState } from "react";
import { useViewControl } from "../hooks/useViewControl";
import { dist } from "../libs/geometry";
import { Touch } from "../libs/touch";
import { Op } from "../model/op";
import { LayerMod, StateRender } from "../model/state";
import { createOp, createTouch, useAppState } from "../store/appState";
import { useGlobalSettings } from "../store/globalSetting";
import CanvasArea, { computePos } from "./CanvasArea";

export default function MainCanvasArea() {
  const store = useAppState();

  const containerRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  const { layerMod } = useControl(containerRef);
  useViewControl(containerRef);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    StateRender(store.stateContainer.state, ctx, layerMod);
  }, [store.stateContainer.state, canvasRef, layerMod]);

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

function useControl(containerRef: { current: HTMLDivElement | null }) {
  const touchRef = useRef<Touch | null>(null);
  const { fingerOperations } = useGlobalSettings((state) => state);
  const [layerMod, setLayerMod] = useState<null | LayerMod>(null);

  const stateRef = useRef<null | {
    type: "drawing";
    op: Op;
    lastPos: [number, number];
    pointerId: number;
    layerId: string;
  }>(null);

  function redraw() {
    setLayerMod(
      stateRef.current?.op && touchRef.current && stateRef.current
        ? {
            layerId: stateRef.current.layerId,
            apply: touchRef.current?.transfer,
          }
        : null
    );
  }

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;
      const pos = computePos(e, containerRef.current);

      const store = useAppState.getState();
      const layerId =
        store.stateContainer.state.layers[store.uiState.layerIndex]?.id;

      if (
        stateRef.current == null &&
        layerId != null &&
        e.button === 0 &&
        !(fingerOperations && e.pointerType === "touch")
      ) {
        touchRef.current = createTouch(store);
        if (touchRef.current == null) return;
        touchRef.current.stroke(pos[0], pos[1], e.pressure);

        let op = createOp(store);
        if (op == null) return;
        opPush(op, pos, e.pressure);

        stateRef.current = {
          type: "drawing",
          op,
          lastPos: pos,
          pointerId: e.pointerId,
          layerId,
        };
        redraw();
        return;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!containerRef.current || !stateRef.current) return;

      if (stateRef.current.type === "drawing") {
        if (e.pointerId !== stateRef.current.pointerId) return;
        const pos = computePos(e, containerRef.current);

        const { op, lastPos } = stateRef.current;
        if (dist(lastPos, pos) > 3) {
          opPush(op, pos, e.pressure);

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

        const { op, lastPos } = stateRef.current;
        const pos = computePos(e, containerRef.current);

        // If the pointer is moved, we need to add the last position
        if (dist(lastPos, pos) > 0) {
          opPush(op, pos, e.pressure);

          touchRef.current.stroke(pos[0], pos[1], 0);
        }

        touchRef.current.end();
        store.apply(op, touchRef.current.transfer);

        touchRef.current = null;
        stateRef.current = null;
        redraw();
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
  }, [containerRef, touchRef, fingerOperations]);

  return { layerMod };
}

function opPush(op: Op, pos: [number, number], pressure: number) {
  if (op.type === "fill") {
    op.path.push({ pos });
  } else if (op.type === "bucketFill") {
    op.pos = pos;
  } else if (op.type === "stroke") {
    op.path.push({ pos, pressure });
  } else {
    throw new Error(`Unsupported operation type: ${op.type}`);
  }
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
