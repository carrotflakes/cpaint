import { useRef, useState, useEffect, useCallback } from "react";
import { dist, Pos } from "../libs/geometry";
import { Touch } from "../libs/touch";
import { Op } from "../model/op";
import { LayerMod } from "../model/state";
import { useAppState, createTouch, createOp } from "../store/appState";
import { useGlobalSettings } from "../store/globalSetting";
import { computePos } from "../components/CanvasArea";
import * as color from "color-convert";

export function useDrawControl(
  containerRef: {
    current: HTMLDivElement | null;
  },
  canvasRef: {
    current: HTMLCanvasElement | null;
  }
) {
  const touchRef = useRef<Touch | null>(null);
  const { touchToDraw } = useGlobalSettings((state) => state);
  const [layerMod, setLayerMod] = useState<null | LayerMod>(null);
  const { eyeDropper, updateEyeDropper } = useEyeDropper(canvasRef);

  const stateRef = useRef<
    | null
    | {
        type: "drawing";
        op: Op;
        lastPos: [number, number];
        pointerId: number;
        layerId: string;
      }
    | {
        type: "eyeDropper";
        pointerId: number;
      }
  >(null);

  function redraw() {
    setLayerMod(
      stateRef.current?.type === "drawing" &&
        touchRef.current &&
        stateRef.current
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
      if (!containerRef.current || stateRef.current) return;
      const pos = computePos(e, containerRef.current);

      const store = useAppState.getState();
      const tool = store.uiState.tool;
      const layerId =
        store.stateContainer.state.layers[store.uiState.layerIndex]?.id;
      if (!layerId) return;

      if (
        (e.pointerType === "mouse" && e.button === 0) ||
        e.pointerType === "pen" ||
        (touchToDraw && e.pointerType === "touch")
      ) {
        if (tool === "eyeDropper") {
          stateRef.current = {
            type: "eyeDropper",
            pointerId: e.pointerId,
          };
          updateEyeDropper(pos);
        } else {
          touchRef.current = createTouch(store);
          if (touchRef.current == null) return;
          touchRef.current.stroke(pos[0], pos[1], e.pressure);

          let op = createOp(store);
          if (op == null) return;
          opPush(op, pos, e.pressure);

          if (!store.uiState.erase)
            store.addColorToHistory(store.uiState.color);

          stateRef.current = {
            type: "drawing",
            op,
            lastPos: pos,
            pointerId: e.pointerId,
            layerId,
          };
          redraw();
        }
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
      } else if (stateRef.current.type === "eyeDropper") {
        if (e.pointerId !== stateRef.current.pointerId) return;
        const pos = computePos(e, containerRef.current);
        updateEyeDropper(pos);
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
      } else if (stateRef.current.type === "eyeDropper") {
        if (e.pointerId !== stateRef.current.pointerId) return;
        const pos = computePos(e, containerRef.current);
        updateEyeDropper(pos, true);
        stateRef.current = null;
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
  }, [containerRef, touchRef, touchToDraw]);

  return { layerMod, eyeDropper };
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

function useEyeDropper(canvasRef: { current: HTMLCanvasElement | null }) {
  const [eyeDropper, setEyeDropper] = useState<null | {
    pos: [number, number];
    color: string;
  }>(null);

  const updateEyeDropper = useCallback(
    (pos: Pos, final?: boolean) => {
      const ctx = canvasRef.current?.getContext("2d", {
        willReadFrequently: true,
      })!;
      const color = pixelColor(ctx, pos[0], pos[1]);
      if (final) {
        useAppState.getState().update((draft) => {
          draft.uiState.color = color;
        });
        setEyeDropper(null);
      } else {
        setEyeDropper({ pos, color });
      }
    },
    [canvasRef]
  );

  return { eyeDropper, updateEyeDropper };
}

function pixelColor(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const imageData = ctx.getImageData(x, y, 1, 1);
  return (
    "#" +
    color.rgb.hex([imageData.data[0], imageData.data[1], imageData.data[2]])
  );
}
